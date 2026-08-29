"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ArticleActions({
  articleId,
  isRead,
  isStarred,
  sourceUrl,
}: {
  articleId: string;
  isRead: boolean;
  isStarred: boolean;
  sourceUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [read, setRead] = useState(isRead);
  const [starred, setStarred] = useState(isStarred);

  async function toggleRead() {
    const next = !read;
    setRead(next);
    await fetch(`/api/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: next }),
    });
    startTransition(() => router.refresh());
  }

  async function toggleStar() {
    const next = !starred;
    setStarred(next);
    await fetch(`/api/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleRead}
        disabled={isPending}
        className={`rounded-md px-3 py-1.5 text-sm transition ${
          read ? "text-zinc-400" : "bg-blue-50 text-blue-600"
        } hover:bg-zinc-100`}
      >
        {read ? "标记为未读" : "标记为已读"}
      </button>
      <button
        onClick={toggleStar}
        disabled={isPending}
        className={`rounded-md px-3 py-1.5 text-sm transition hover:bg-zinc-100 ${
          starred ? "text-amber-500" : "text-zinc-500"
        }`}
      >
        {starred ? "★ 已收藏" : "☆ 收藏"}
      </button>
      <Link
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-100"
      >
        查看原文 ↗
      </Link>
    </div>
  );
}
