"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Feed = {
  id: string;
  title: string;
  url: string;
  siteUrl: string | null;
  favicon: string | null;
  description: string | null;
  lastFetchedAt: string | null;
  isHealthy: boolean | null;
  lastError: string | null;
  _count: { articles: number };
};

function timeAgo(date: string | null) {
  if (!date) return "从未";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(date).toLocaleDateString("zh-CN");
}

export function FeedList({ feeds }: { feeds: Feed[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removeFeed(feedId: string) {
    if (!confirm("确定删除该订阅源及其全部文章？")) return;
    setBusyId(feedId);
    setError("");
    const res = await fetch(`/api/feeds/${feedId}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError("删除失败");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function refreshFeed(feed: Feed) {
    setBusyId(feed.id);
    setError("");
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedId: feed.id }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "刷新失败");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (feeds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-400">
        还没有订阅任何 RSS 源，在上方添加一个吧。
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {feeds.map((feed) => (
          <li key={feed.id} className="flex items-center gap-4 px-4 py-3">
            {feed.favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={feed.favicon}
                alt=""
                className="h-8 w-8 rounded-md"
                loading="lazy"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-200 text-sm font-medium text-zinc-500">
                {feed.title.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {feed.title}
              </p>
              <p className="truncate text-xs text-zinc-400">
                {feed.siteUrl || feed.url}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {feed._count.articles} 篇文章 · 上次抓取 {timeAgo(feed.lastFetchedAt)}
              </p>
              {feed.isHealthy === false && (
                <p
                  className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                  title={feed.lastError || "该源连续抓取失败，可能已失效"}
                >
                  ⚠ 可能失效
                </p>
              )}
            </div>
            <button
              onClick={() => refreshFeed(feed)}
              disabled={busyId === feed.id}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
            >
              {busyId === feed.id ? "刷新中..." : "刷新"}
            </button>
            <button
              onClick={() => removeFeed(feed.id)}
              disabled={busyId === feed.id}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
