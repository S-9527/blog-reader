import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeContent } from "@/lib/sanitize";
import { ArticleActions } from "@/components/article-actions";

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function ArticlePage(
  props: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  const { id } = await props.params;

  const article = await prisma.article.findFirst({
    where: { id, userId },
    include: { feed: true },
  });

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl p-12 text-center text-zinc-400">
        文章不存在或已被删除。
      </div>
    );
  }

  if (!article.isRead) {
    await prisma.article.update({
      where: { id: article.id },
      data: { isRead: true },
    });
  }

  const safeContent = sanitizeContent(article.content || "");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-700">
          ← 返回文章列表
        </Link>
      </nav>

      <article>
        <header className="mb-6 border-b border-zinc-100 pb-6">
          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
            {article.feed.favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.feed.favicon}
                alt=""
                className="h-4 w-4 rounded-sm"
                loading="lazy"
              />
            )}
            <Link href={`/f/${article.feedId}`} className="font-medium text-zinc-500 hover:text-zinc-700">
              {article.feed.title}
            </Link>
            {article.author && <span>· {article.author}</span>}
          </div>
          <h1 className="text-2xl font-bold leading-tight text-zinc-900">
            {article.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {formatDate(article.publishedAt)}
          </p>
          <div className="mt-4">
            <ArticleActions
              articleId={article.id}
              isRead={article.isRead}
              isStarred={article.isStarred}
              sourceUrl={article.url}
            />
          </div>
        </header>

        {safeContent ? (
          <div
            className="prose prose-zinc prose-img:my-4 prose-p:leading-relaxed prose-a:text-blue-600 prose-pre:overflow-x-auto max-w-none"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        ) : (
          <p className="text-zinc-400">该文章没有正文内容，你可能需要查看原文。</p>
        )}
      </article>
    </div>
  );
}
