import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArticleList } from "@/components/article-list";
import { listArticles } from "@/lib/list-articles";

export default async function FeedPage(
  props: { params: Promise<{ feedId: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  const { feedId } = await props.params;

  const feed = await prisma.feed.findFirst({
    where: { id: feedId, userId },
  });
  if (!feed) {
    return (
      <div className="p-12 text-center text-zinc-400">订阅源不存在</div>
    );
  }

  const { articles, nextCursor } = await listArticles({
    userId,
    feedId,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-100 px-6 py-4">
        <div className="flex items-center gap-2">
          {feed.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={feed.favicon} alt="" className="h-5 w-5 rounded-sm" loading="lazy" />
          )}
          <h1 className="text-lg font-semibold text-zinc-900">{feed.title}</h1>
        </div>
      </header>
      <ArticleList articles={articles} nextCursor={nextCursor} feedId={feedId} />
    </div>
  );
}
