import { prisma } from "@/lib/db";

export type ArticleListFilter = {
  userId: string;
  feedId?: string;
  onlyUnread?: boolean;
  onlyStarred?: boolean;
};

export type ArticleCursor = {
  publishedAt: string;
  id: string;
};

const PAGE_SIZE = 50;

function buildWhere(filter: ArticleListFilter, cursor?: ArticleCursor) {
  const where: Record<string, unknown> = { userId: filter.userId };
  if (filter.feedId) where.feedId = filter.feedId;
  if (filter.onlyUnread) where.isRead = false;
  if (filter.onlyStarred) where.isStarred = true;

  if (cursor) {
    const cursorDate = new Date(cursor.publishedAt);
    where.OR = [
      { publishedAt: { lt: cursorDate } },
      { publishedAt: cursorDate, id: { lt: cursor.id } },
    ];
  }

  return where;
}

export type ListedArticle = {
  id: string;
  title: string;
  url: string;
  content: string;
  author: string | null;
  publishedAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  feed: { title: string; favicon: string | null };
};

export async function listArticles(
  filter: ArticleListFilter,
  cursor?: ArticleCursor,
  pageSize = PAGE_SIZE
): Promise<{ articles: ListedArticle[]; nextCursor: ArticleCursor | null }> {
  const rows = await prisma.article.findMany({
    where: buildWhere(filter, cursor),
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    include: { feed: { select: { title: true, favicon: true } } },
  });

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const articles: ListedArticle[] = pageRows.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    content: a.content || "",
    author: a.author,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    isRead: a.isRead,
    isStarred: a.isStarred,
    feed: a.feed,
  }));

  const nextCursor =
    hasMore && pageRows.length > 0 && pageRows[pageRows.length - 1].publishedAt
      ? {
          publishedAt: pageRows[pageRows.length - 1].publishedAt!.toISOString(),
          id: pageRows[pageRows.length - 1].id,
        }
      : null;

  return { articles, nextCursor };
}
