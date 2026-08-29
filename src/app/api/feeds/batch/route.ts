import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addFeed } from "@/lib/add-feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BATCH = 20;

type BatchItemResult = {
  url: string;
  title: string | null;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { urls?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];

  if (urls.length === 0) {
    return NextResponse.json({ error: "未选择任何源" }, { status: 400 });
  }

  const urlsToProcess = urls.slice(0, MAX_BATCH);

  const added: BatchItemResult[] = [];
  const skipped: BatchItemResult[] = [];
  const failed: { url: string; error: string }[] = [];

  for (const url of urlsToProcess) {
    try {
      const feed = await addFeed(session.user.id, url);
      added.push({ url: feed.url, title: feed.title });
    } catch (e) {
      const message = e instanceof Error ? e.message : "添加失败";
      if (message === "该源已订阅") {
        skipped.push({ url, title: null });
      } else {
        failed.push({ url, error: message });
      }
    }
  }

  return NextResponse.json({ added, skipped, failed });
}
