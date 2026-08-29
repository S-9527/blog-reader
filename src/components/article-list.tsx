"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ArticleItem = {
  id: string;
  title: string;
  url: string;
  content: string;
  author: string | null;
  publishedAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  feed: { title: string; favicon: string | null };
};

function timeAgo(date: string | null) {
  if (!date) return "";
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

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function ArticleList({
  articles,
}: {
  articles: ArticleItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleRead(article: ArticleItem) {
    setPendingId(article.id);
    await fetch(`/api/articles/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: !article.isRead }),
    });
    setPendingId(null);
    startTransition(() => router.refresh());
  }

  async function toggleStar(article: ArticleItem) {
    setPendingId(article.id);
    await fetch(`/api/articles/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !article.isStarred }),
    });
    setPendingId(null);
    startTransition(() => router.refresh());
  }

  if (articles.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-400">
        暂无文章。去「订阅源管理」添加一个 RSS 源吧。
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {articles.map((article) => (
        <li
          key={article.id}
          className={`flex items-start gap-3 px-6 py-4 transition hover:bg-zinc-50 ${
            article.isRead ? "opacity-60" : ""
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
              {article.feed.favicon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.feed.favicon}
                  alt=""
                  className="h-3.5 w-3.5 rounded-sm"
                  loading="lazy"
                />
              )}
              <span className="font-medium text-zinc-500">{article.feed.title}</span>
              {article.author && <span>· {article.author}</span>}
              {article.publishedAt && (
                <span>· {timeAgo(article.publishedAt)}</span>
              )}
            </div>
            <Link
              href={`/article/${article.id}`}
              className={`block text-base leading-snug text-zinc-900 hover:underline ${
                article.isRead ? "font-normal" : "font-semibold"
              }`}
            >
              {article.title}
            </Link>
            {article.content && (
              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                {stripHtml(article.content)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => toggleRead(article)}
              disabled={isPending && pendingId === article.id}
              className={`rounded-md p-1.5 text-xs transition hover:bg-zinc-200 ${
                article.isRead ? "text-zinc-400" : "text-blue-600"
              }`}
              title={article.isRead ? "标记为未读" : "标记为已读"}
            >
              {article.isRead ? "已读" : "未读"}
            </button>
            <button
              onClick={() => toggleStar(article)}
              disabled={isPending && pendingId === article.id}
              className={`rounded-md p-1.5 text-sm transition hover:bg-zinc-200 ${
                article.isStarred ? "text-amber-500" : "text-zinc-400"
              }`}
              title={article.isStarred ? "取消收藏" : "收藏"}
            >
              {article.isStarred ? "★" : "☆"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
