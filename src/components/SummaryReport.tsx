"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";

export function SummaryReport({ filePath }: { filePath: string }) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.text();
      })
      .then(setMarkdown)
      .catch((err) => setError(err.message));
  }, [filePath]);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (markdown === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading report...
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-none prose-headings:text-neutral-100 prose-p:text-neutral-300 prose-a:text-blue-400 prose-strong:text-neutral-200 prose-code:text-neutral-300 prose-th:text-neutral-300 prose-td:text-neutral-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
