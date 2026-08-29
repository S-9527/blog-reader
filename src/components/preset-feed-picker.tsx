"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Rss, Sparkles, TriangleAlert } from "lucide-react";
import {
  PRESET_CATEGORIES,
  type PresetFeedCategory,
} from "@/lib/preset-feeds";

type Props = {
  subscribedUrls: Set<string>;
  presets: {
    title: string;
    url: string;
    category: PresetFeedCategory;
    description: string | null;
    isValid: boolean;
    isNew: boolean;
  }[];
};

type Result = {
  added: number;
  skipped: number;
  failed: { url: string; error: string }[];
};

function normalize(url: string) {
  try {
    return new URL(url).toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function PresetFeedPicker({ subscribedUrls, presets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const normalizedSubscribed = useMemo(
    () => new Set(Array.from(subscribedUrls).map(normalize)),
    [subscribedUrls]
  );

  const feedsByCategory = useMemo(() => {
    const map = new Map<PresetFeedCategory, typeof presets>();
    for (const category of PRESET_CATEGORIES) {
      map.set(category, presets.filter((f) => f.category === category));
    }
    return map;
  }, [presets]);

  const addableCount = useMemo(() => {
    return presets.filter(
      (f) => f.isValid && !normalizedSubscribed.has(normalize(f.url))
    ).length;
  }, [presets, normalizedSubscribed]);

  function toggle(feed: (typeof presets)[number]) {
    const isSubscribed = normalizedSubscribed.has(normalize(feed.url));
    if (isSubscribed || !feed.isValid) return;
    setResult(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(feed.url)) next.delete(feed.url);
      else next.add(feed.url);
      return next;
    });
  }

  async function addSelected() {
    if (selected.size === 0 || loading) return;
    setLoading(true);
    setResult(null);
    const urls = Array.from(selected);
    try {
      const res = await fetch("/api/feeds/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({
          added: 0,
          skipped: 0,
          failed: urls.map((u) => ({ url: u, error: data.error || "添加失败" })),
        });
      } else {
        setResult({
          added: data.added?.length ?? 0,
          skipped: data.skipped?.length ?? 0,
          failed: data.failed ?? [],
        });
        setSelected(new Set());
      }
    } catch {
      setResult({
        added: 0,
        skipped: 0,
        failed: urls.map((u) => ({ url: u, error: "网络错误" })),
      });
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">官方博客源库</h2>
        </div>
        <button
          onClick={addSelected}
          disabled={selected.size === 0 || loading}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          一键添加选中 ({selected.size})
        </button>
      </div>

      <p className="mb-4 text-xs text-zinc-400">
        勾选框架、语言、平台等官方博客，一键批量订阅，追踪技术更新。已订阅的源会标注并无法重复添加；
        <span className="font-medium text-emerald-600">新发现的源</span> 由定时任务自动探测加入，
        失效的源（<TriangleAlert className="inline h-3 w-3 text-amber-500" />）暂不可订阅。
      </p>

      {result && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            result.failed.length > 0
              ? "bg-amber-50 text-amber-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          <p>
            新增 {result.added} 个源；已订阅跳过 {result.skipped} 个
            {result.failed.length > 0 && `；失败 ${result.failed.length} 个`}。
          </p>
          {result.failed.map((f) => (
            <p key={f.url} className="mt-1 text-xs opacity-80">
              {f.url}: {f.error}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-5">
        {PRESET_CATEGORIES.map((category) => {
          const feeds = feedsByCategory.get(category) ?? [];
          if (feeds.length === 0) return null;
          return (
            <div key={category}>
              <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                {category}
                <span className="ml-1 text-[10px] font-normal text-zinc-300">
                  {feeds.length}
                </span>
              </p>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
                {feeds.map((feed) => {
                  const isSubscribed = normalizedSubscribed.has(normalize(feed.url));
                  const isChecked = selected.has(feed.url);
                  const isSelectable = !isSubscribed && feed.isValid;
                  return (
                    <li key={feed.url}>
                      <button
                        type="button"
                        onClick={() => toggle(feed)}
                        disabled={!isSelectable}
                        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                          isSubscribed || !feed.isValid
                            ? "cursor-not-allowed bg-zinc-50 opacity-60"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isChecked
                              ? "border-blue-600 bg-blue-600 text-white"
                              : isSubscribed
                                ? "border-zinc-300 bg-zinc-200 text-zinc-500"
                                : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                          {isSubscribed && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-900">
                            {feed.title}
                            {isSubscribed && (
                              <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-normal text-zinc-500">
                                已订阅
                              </span>
                            )}
                            {feed.isNew && (
                              <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                                <Sparkles className="h-3 w-3" />
                                新发现
                              </span>
                            )}
                            {!feed.isValid && (
                              <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                                <TriangleAlert className="h-3 w-3" />
                                失效
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {feed.description}
                          </span>
                          <span className="block truncate text-xs text-zinc-400">
                            {feed.url}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {addableCount === 0 && (
        <p className="mt-4 rounded-md bg-green-50 p-3 text-center text-sm text-green-700">
          官方博客源库中可订阅的源你都已订阅了。
        </p>
      )}
    </div>
  );
}
