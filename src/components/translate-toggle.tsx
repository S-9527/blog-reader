"use client";

import { useState, type ReactNode } from "react";
import { Languages, Loader2, TriangleAlert } from "lucide-react";

type Props = {
  articleId: string;
  original: ReactNode;
};

export function TranslateToggle({ articleId, original }: Props) {
  const [mode, setMode] = useState<"original" | "translated">("original");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translated, setTranslated] = useState<string | null>(null);

  async function showTranslation() {
    if (translated) {
      setMode("translated");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/translate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "翻译失败");
        return;
      }
      setTranslated(data.content);
      setMode("translated");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1 self-end rounded-md border border-zinc-200 bg-zinc-50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("original")}
          className={`rounded px-3 py-1 transition ${
            mode === "original"
              ? "bg-white font-medium text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          原文
        </button>
        <button
          type="button"
          onClick={showTranslation}
          disabled={loading}
          className={`flex items-center gap-1 rounded px-3 py-1 transition ${
            mode === "translated"
              ? "bg-white font-medium text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {!loading && <Languages className="h-3.5 w-3.5" />}
          {loading ? "翻译中…" : "中文译文"}
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {mode === "translated" && !loading && translated && (
        <div
          className="prose prose-zinc prose-img:my-4 prose-p:leading-relaxed prose-a:text-blue-600 prose-pre:overflow-x-auto max-w-none"
          dangerouslySetInnerHTML={{ __html: translated }}
        />
      )}

      {mode === "original" && !loading && original}
    </div>
  );
}
