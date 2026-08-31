"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  Rss,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type DirectoryFeed = {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string | null;
  isValid: boolean;
  isNew: boolean;
  source: string;
};

type Props = {
  subscribedUrls: Set<string>;
  feeds: DirectoryFeed[];
};

const PAGE_SIZE = 60;

function normalize(url: string) {
  try {
    return new URL(url).toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function DiscoverDirectory({ subscribedUrls, feeds }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const hasOfficial = feeds.some((f) => f.category === "官方源");
  const [category, setCategory] = useState<string>(hasOfficial ? "官方源" : "全部");
  const [onlyNew, setOnlyNew] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedSubscribed = useMemo(
    () => new Set(Array.from(subscribedUrls).map(normalize)),
    [subscribedUrls]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of feeds) if (f.category) set.add(f.category);
    return ["全部", ...Array.from(set).sort()];
  }, [feeds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = feeds;
    if (category !== "全部") list = list.filter((f) => f.category === category);
    if (onlyNew) list = list.filter((f) => f.isNew);
    if (q) {
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          (f.description || "").toLowerCase().includes(q) ||
          f.url.toLowerCase().includes(q)
      );
    }
    // 排序：新发现优先，其次有效
    return [...list].sort((a, b) => {
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      if (a.isValid !== b.isValid) return a.isValid ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }, [feeds, query, category, onlyNew]);

  const visible = filtered.slice(0, limit);

  async function subscribeOne(feed: DirectoryFeed) {
    setSubscribing(feed.url);
    setError(null);
    try {
      const res = await fetch("/api/feeds/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [feed.url] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "订阅失败");
      }
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSubscribing(null);
    }
  }

  const total = filtered.length;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Rss className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-900">发现新源</h2>
        <span className="text-xs text-zinc-400">已收录 {total} 个源</span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-zinc-400">
        由社区维护的开放订阅目录自动同步，无需人工添加。浏览或按关键词筛选，
        一键订阅即可开始追踪。
        <span className="font-medium text-emerald-600">新发现</span> 的源由定时任务自动加入，
        失效的源（<TriangleAlert className="inline h-3 w-3 text-amber-500" />）暂不可订阅。
      </p>

      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="搜索源（标题 / 描述 / 地址）"
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setLimit(PAGE_SIZE);
              }}
              className={`rounded-full px-3 py-1 text-xs transition ${
                category === c
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOnlyNew((v) => !v);
              setLimit(PAGE_SIZE);
            }}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
              onlyNew
                ? "bg-emerald-500 text-white"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            只看新发现
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">
          没有符合条件的源。
        </div>
      ) : (
        <>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
            {visible.map((feed) => {
              const isSubscribed = normalizedSubscribed.has(normalize(feed.url));
              const canSubscribe = feed.isValid && !isSubscribed;
              const isBusy = subscribing === feed.url;
              return (
                <li key={feed.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-zinc-900">
                        {feed.title}
                      </span>
                      {feed.category && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {feed.category}
                        </span>
                      )}
                      {feed.isNew && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                          <Sparkles className="h-3 w-3" />
                          新发现
                        </span>
                      )}
                      {!feed.isValid && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                          <TriangleAlert className="h-3 w-3" />
                          失效
                        </span>
                      )}
                    </div>
                    {feed.description && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {feed.description}
                      </p>
                    )}
                    {feed.url && (
                      <p className="truncate text-xs text-zinc-400">{feed.url}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => subscribeOne(feed)}
                    disabled={!canSubscribe || isBusy}
                    className={`flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      isSubscribed
                        ? "cursor-default bg-zinc-100 text-zinc-400"
                        : !feed.isValid
                          ? "cursor-not-allowed bg-zinc-50 text-zinc-300"
                          : "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSubscribed ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : null}
                    {isSubscribed ? "已订阅" : "订阅"}
                  </button>
                </li>
              );
            })}
          </ul>

          {visible.length < filtered.length && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
            >
              <ChevronDown className="h-4 w-4" />
              加载更多（已显示 {visible.length}/{filtered.length}）
            </button>
          )}
        </>
      )}
    </div>
  );
}
