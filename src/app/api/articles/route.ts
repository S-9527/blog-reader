import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listArticles, type ArticleCursor } from "@/lib/list-articles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = new URL(request.url);
  const feedId = url.searchParams.get("feedId") || undefined;
  const onlyUnread = url.searchParams.get("onlyUnread") === "1";
  const onlyStarred = url.searchParams.get("onlyStarred") === "1";
  const limitParam = Number(url.searchParams.get("limit") || "50");

  const cursorRaw = url.searchParams.get("cursor");
  let cursor: ArticleCursor | undefined;
  if (cursorRaw) {
    try {
      const parsed = JSON.parse(cursorRaw);
      if (parsed?.publishedAt && parsed?.id) {
        cursor = { publishedAt: parsed.publishedAt, id: parsed.id };
      }
    } catch {
      // 非法游标忽略
    }
  }

  const pageSize = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 50)
    : 50;

  try {
    const { articles, nextCursor } = await listArticles(
      { userId: session.user.id, feedId, onlyUnread, onlyStarred },
      cursor,
      pageSize
    );
    return NextResponse.json({ articles, nextCursor });
  } catch {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}