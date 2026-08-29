import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractArticle } from "@/lib/extract-article";
import { sanitizeContent } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const article = await prisma.article.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  // 已提取过完整正文则直接返回
  if (article.content && article.content.length > 500) {
    return NextResponse.json({ content: article.content });
  }

  let extracted;
  try {
    extracted = await extractArticle(article.url);
  } catch (e) {
    const message = e instanceof Error ? e.message : "提取失败";
    return NextResponse.json(
      { error: `无法获取该文章全文：${message}` },
      { status: 502 }
    );
  }

  const fullContent =
    extracted.content || extracted.textContent || article.content || "";

  const updated = await prisma.article.update({
    where: { id: article.id },
    data: { content: fullContent },
  });

  return NextResponse.json({ content: sanitizeContent(updated.content || "") });
}
