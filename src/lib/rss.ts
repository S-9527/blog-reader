import Parser from "rss-parser";
import { prisma } from "@/lib/db";

type CustomFeed = {
  title?: string;
  description?: string;
  link?: string;
  items: CustomItem[];
};
type CustomItem = {
  title: string;
  link: string;
  content: string;
  contentSnippet: string;
  creator: string;
  pubDate: string;
  isoDate: string;
  guid?: string;
};

const parser = new Parser<CustomFeed, CustomItem>({
  timeout: 15000,
  headers: {
    "User-Agent": "FeedFlow RSS Reader (blog reader)",
  },
});

export function getFavicon(siteUrl: string) {
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return undefined;
  }
}

export async function parseFeed(url: string) {
  const feed = await parser.parseURL(url);
  return feed as { title?: string; description?: string; link?: string; items: CustomItem[] };
}

export async function upsertArticles(
  feedId: string,
  userId: string,
  feed: { items?: CustomItem[] }
) {
  if (!feed.items || feed.items.length === 0) return;

  for (const item of feed.items) {
    if (!item.link) continue;
    await prisma.article.upsert({
      where: {
        userId_url: { userId, url: item.link },
      },
      create: {
        title: item.title?.trim() || "无标题",
        url: item.link,
        content: item.content || item.contentSnippet || "",
        author: item.creator || null,
        publishedAt: item.isoDate ? new Date(item.isoDate) : null,
        feedId,
        userId,
      },
      update: {},
    });
  }
}
