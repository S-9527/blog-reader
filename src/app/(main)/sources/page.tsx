import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddFeedForm } from "@/components/add-feed-form";
import { FeedList } from "@/components/feed-list";
import { PresetFeedPicker } from "@/components/preset-feed-picker";
import type { PresetFeedCategory } from "@/lib/preset-feeds";

export default async function SourcesPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  const feeds = await prisma.feed.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } },
  });

  const subscribedUrls = new Set(feeds.map((f) => f.url));

  const presets = await prisma.presetFeed.findMany({
    orderBy: [{ isNew: "desc" }, { category: "asc" }, { title: "asc" }],
    select: {
      title: true,
      url: true,
      category: true,
      description: true,
      isValid: true,
      isNew: true,
    },
  });

  const presetsForPicker = presets.map((p) => ({
    ...p,
    category: p.category as PresetFeedCategory,
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">订阅源管理</h1>
        <p className="mt-1 text-sm text-zinc-500">
          添加你感兴趣的 RSS/Atom 源，FeedFlow 会定时抓取最新文章。
        </p>
      </header>
      <AddFeedForm />
      <div className="mb-6">
        <PresetFeedPicker subscribedUrls={subscribedUrls} presets={presetsForPicker} />
      </div>
      <FeedList
        feeds={feeds.map((f) => ({
          id: f.id,
          title: f.title,
          url: f.url,
          siteUrl: f.siteUrl,
          favicon: f.favicon,
          description: f.description,
          lastFetchedAt: f.lastFetchedAt?.toISOString() ?? null,
          isHealthy: f.isHealthy,
          lastError: f.lastError,
          _count: f._count,
        }))}
      />
    </div>
  );
}
