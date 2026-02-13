"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { ScoresJson, ScoreEntry } from "@/lib/types";

function JudgeBadge({ value }: { value: string }) {
  const pass = value === "yes";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        pass
          ? "bg-green-400/10 text-green-400"
          : "bg-red-400/10 text-red-400"
      }`}
    >
      {pass ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

export function ScoresTable({ filePath }: { filePath: string }) {
  const [data, setData] = useState<ScoresJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load scores");
        return res.json() as Promise<ScoresJson>;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [filePath]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading scores...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Pass rate",
            value: `${(data.aggregate.pass_rate * 100).toFixed(0)}%`,
          },
          {
            label: "Total variations",
            value: data.aggregate.total_variations,
          },
          { label: "Total attempts", value: data.aggregate.total_attempts },
          {
            label: "Avg rounds",
            value: data.aggregate.avg_rounds.toFixed(1),
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2"
          >
            <p className="text-xs text-neutral-500">{m.label}</p>
            <p className="text-lg font-semibold text-neutral-100">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Per-image table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50 text-left text-neutral-400">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Style</th>
              <th className="px-3 py-2 font-medium">Quality</th>
              <th className="px-3 py-2 font-medium">Rounds</th>
            </tr>
          </thead>
          <tbody>
            {data.images.map((img: ScoreEntry, i: number) => (
              <tr
                key={i}
                className="border-b border-neutral-800/50 hover:bg-neutral-900/50"
              >
                <td className="px-3 py-2 text-neutral-500">
                  {img.product_number}
                  {img.variation}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-neutral-300">
                  {img.product_description}
                </td>
                <td className="px-3 py-2">
                  <JudgeBadge value={img.final_style_judgment} />
                </td>
                <td className="px-3 py-2">
                  <JudgeBadge value={img.final_quality_judgment} />
                </td>
                <td className="px-3 py-2 text-neutral-400">{img.rounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
