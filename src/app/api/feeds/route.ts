import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFeed, upsertArticles, getFavicon } from "@/lib/rss";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const feeds = await prisma.feed.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json(feeds);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "缺少 RSS 地址" }, { status: 400 });
  }

  let feedUrl: string;
  try {
    feedUrl = new URL(url).toString();
  } catch {
    return NextResponse.json({ error: "无效的 URL" }, { status: 400 });
  }

  const existing = await prisma.feed.findUnique({
    where: { userId_url: { userId: session.user.id, url: feedUrl } },
  });
  if (existing) {
    return NextResponse.json({ error: "该源已订阅" }, { status: 409 });
  }

  let parsed;
  try {
    parsed = await parseFeed(feedUrl);
  } catch {
    return NextResponse.json(
      { error: "无法解析该地址，请确认是有效的 RSS/Atom 源" },
      { status: 400 }
    );
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
      userId: session.user.id,
    },
  });

  await upsertArticles(feed.id, session.user.id, parsed);

  return NextResponse.json(feed, { status: 201 });
}
