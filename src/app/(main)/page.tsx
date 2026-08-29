import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArticleList } from "@/components/article-list";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  const articles = await prisma.article.findMany({
    where: { userId },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: {
      feed: { select: { title: true, favicon: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">全部文章</h1>
      </header>
      <ArticleList
        articles={articles.map((a) => ({
          id: a.id,
          title: a.title,
          url: a.url,
          content: a.content || "",
          author: a.author,
          publishedAt: a.publishedAt?.toISOString() ?? null,
          isRead: a.isRead,
          isStarred: a.isStarred,
          feed: a.feed,
        }))}
      />
    </div>
  );
}
