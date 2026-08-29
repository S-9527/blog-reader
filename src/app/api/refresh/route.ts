import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFeed, upsertArticles } from "@/lib/rss";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { feedId } = await request.json();
  if (!feedId) {
    return NextResponse.json({ error: "缺少 feedId" }, { status: 400 });
  }

  const feed = await prisma.feed.findFirst({
    where: { id: feedId, userId: session.user.id },
  });
  if (!feed) {
    return NextResponse.json({ error: "源不存在" }, { status: 404 });
  }

  let parsed;
  try {
    parsed = await parseFeed(feed.url);
  } catch {
    return NextResponse.json({ error: "刷新失败，无法解析源" }, { status: 400 });
  }

  await upsertArticles(feed.id, session.user.id, parsed);

  await prisma.feed.update({
    where: { id: feed.id },
    data: {
      lastFetchedAt: new Date(),
      title: parsed.title?.trim() || feed.title,
      description: parsed.description || feed.description,
      siteUrl: parsed.link || feed.siteUrl,
      favicon: feed.favicon,
    },
  });

  const count = await prisma.article.count({
    where: { feedId: feed.id, userId: session.user.id },
  });

  return NextResponse.json({ success: true, articleCount: count });
}
