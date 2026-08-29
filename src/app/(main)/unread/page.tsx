import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ArticleList } from "@/components/article-list";
import { listArticles } from "@/lib/list-articles";

export default async function UnreadPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  const { articles, nextCursor } = await listArticles({
    userId,
    onlyUnread: true,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">未读文章</h1>
      </header>
      <ArticleList articles={articles} nextCursor={nextCursor} onlyUnread />
    </div>
  );
}
