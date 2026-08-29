import { prisma } from "@/lib/db";
import { parseFeed, upsertArticles, getFavicon } from "@/lib/rss";

export async function addFeed(userId: string, url: string) {
  let feedUrl: string;
  try {
    feedUrl = new URL(url).toString();
  } catch {
    throw new Error("无效的 URL");
  }

  const existing = await prisma.feed.findUnique({
    where: { userId_url: { userId, url: feedUrl } },
  });
  if (existing) {
    throw new Error("该源已订阅");
  }

  let parsed;
  try {
    parsed = await parseFeed(feedUrl);
  } catch {
    throw new Error("无法解析该地址，请确认是有效的 RSS/Atom 源");
  }

  const siteUrl = parsed.link || feedUrl;
  const feed = await prisma.feed.create({
    data: {
      url: feedUrl,
      title: parsed.title?.trim() || siteUrl,
      description: parsed.description || null,
      siteUrl,
      favicon: getFavicon(siteUrl),
      lastFetchedAt: new Date(),
      userId,
    },
  });

  await upsertArticles(feed.id, userId, parsed);

  return feed;
}
