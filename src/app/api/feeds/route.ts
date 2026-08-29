import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addFeed } from "@/lib/add-feed";

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

  try {
    const feed = await addFeed(session.user.id, url);
    return NextResponse.json(feed, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "添加失败";
    const isDuplicate = message === "该源已订阅";
    return NextResponse.json(
      { error: message },
      { status: isDuplicate ? 409 : 400 }
    );
  }
}
