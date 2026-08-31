import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractArticle } from "@/lib/extract-article";
import { translateHtmlToZh, translateTextToZh, isTranslationConfigured } from "@/lib/translate";
import { sanitizeContent } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHORT_CONTENT_THRESHOLD = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!isTranslationConfigured()) {
    return NextResponse.json(
      { error: "翻译功能未配置（缺少 DEEPL_API_KEY）" },
      { status: 501 }
    );
  }

  const { id } = await params;

  const article = await prisma.article.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  // 已有缓存译文则直接返回
  if (article.translatedContent && article.translatedTitle) {
    return NextResponse.json({
      title: article.translatedTitle,
      content: sanitizeContent(article.translatedContent),
    });
  }

  // 确保有完整正文：若原文过短，先提取全文再翻译
  let content = article.content || "";
  if (content.length < SHORT_CONTENT_THRESHOLD) {
    try {
      const extracted = await extractArticle(article.url);
      const full =
        extracted.content || extracted.textContent || article.content || "";
      if (full.length >= content.length) {
        content = full;
        await prisma.article.update({
          where: { id: article.id },
          data: { content: full },
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "提取失败";
      return NextResponse.json(
        { error: `无法获取该文章全文以翻译：${message}` },
        { status: 502 }
      );
    }
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "该文章没有可翻译的正文" }, { status: 400 });
  }

  let translatedTitle: string;
  let translatedContent: string;
  try {
    translatedTitle = await translateTextToZh(article.title);
    translatedContent = await translateHtmlToZh(content);
  } catch (e) {
    const message = e instanceof Error ? e.message : "翻译失败";
    return NextResponse.json({ error: `翻译失败：${message}` }, { status: 502 });
  }

  await prisma.article.update({
    where: { id: article.id },
    data: { translatedTitle, translatedContent },
  });

  return NextResponse.json({
    title: translatedTitle,
    content: sanitizeContent(translatedContent),
  });
}
