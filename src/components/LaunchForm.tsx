"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";

export function LaunchForm() {
  const router = useRouter();
  const [prompts, setPrompts] = useState("");
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("4:3");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptLines = prompts
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const isBatch = promptLines.length > 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (promptLines.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: promptLines,
          num_images: numImages,
          aspect_ratio: aspectRatio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to launch run");
      }

      const data = await res.json();
      // Navigate to batch view with all trajectory IDs
      const ids = (data.runs ?? [])
        .map((r: { trajectory_id: string }) => r.trajectory_id)
        .filter(Boolean);
      if (ids.length === 0) {
        throw new Error("No trajectory IDs returned");
      }
      router.push(`/run/${ids[0]}${ids.length > 1 ? `?batch=${ids.join(",")}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-300">
          Product prompts{" "}
          <span className="text-neutral-500">
            (one per line for batch)
          </span>
        </label>
        <textarea
          value={prompts}
          onChange={(e) => setPrompts(e.target.value)}
          rows={4}
          placeholder={"Matte black ceramic coffee mug with minimal handle\nOversized cream wool cardigan on a young woman"}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {isBatch && (
          <p className="mt-1 text-xs text-blue-400">
            Batch mode: {promptLines.length} prompts will run in parallel
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">
            Images per prompt
          </label>
          <select
            value={numImages}
            onChange={(e) => setNumImages(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-neutral-300">
            Aspect ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="4:3">4:3 (products)</option>
            <option value="3:4">3:4 (fashion)</option>
            <option value="1:1">1:1 (square)</option>
            <option value="16:9">16:9 (wide)</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || promptLines.length === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting
          ? "Launching..."
          : isBatch
            ? `Launch ${promptLines.length} runs`
            : "Launch run"}
      </button>
    </form>
  );
}
