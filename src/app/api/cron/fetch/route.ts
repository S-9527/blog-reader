import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFeed, upsertArticles } from "@/lib/rss";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const feeds = await prisma.feed.findMany({
    include: { user: { select: { id: true } } },
  });

  let fetched = 0;
  let failed = 0;

  for (const feed of feeds) {
    try {
      const parsed = await parseFeed(feed.url);
      await upsertArticles(feed.id, feed.userId, parsed);
      await prisma.feed.update({
        where: { id: feed.id },
        data: { lastFetchedAt: new Date() },
      });
      fetched++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ success: true, feeds: feeds.length, fetched, failed });
}
