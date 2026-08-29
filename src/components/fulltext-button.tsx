"use client";

import { useState } from "react";
import { ExternalLink, Loader2, FileText } from "lucide-react";

type Props = {
  articleId: string;
  sourceUrl: string;
};

export function FullTextButton({ articleId, sourceUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);

  async function loadFullText() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/fulltext`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "获取全文失败");
        return;
      }
      setContent(data.content);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {content ? (
        <div
          className="prose prose-zinc prose-img:my-4 prose-p:leading-relaxed prose-a:text-blue-600 prose-pre:overflow-x-auto max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <div className="my-6 flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
          <FileText className="h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-500">
            该文章仅有摘要，可点击获取完整正文。
          </p>
          <button
            onClick={loadFullText}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "获取中…" : "加载全文"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-400 underline hover:text-zinc-600"
          >
            或在新窗口打开原文
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
