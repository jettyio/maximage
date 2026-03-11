"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useTrajectory } from "@/hooks/useTrajectory";
import { RunStatusBanner } from "@/components/RunStatusBanner";
import { ImageGallery } from "@/components/ImageGallery";
import { SummaryReport } from "@/components/SummaryReport";
import { ScoresTable } from "@/components/ScoresTable";
import { JudgeResults } from "@/components/JudgeResults";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Trajectory } from "@/lib/types";

function extractImages(trajectory: Trajectory) {
  const steps = trajectory.steps;
  if (!steps) return [];

  // 1. Agent workflows: select_images step collects image files
  const selectStep = steps.select_images ?? steps.images;
  if (selectStep) {
    const files = (selectStep.outputs as Record<string, unknown> | undefined)
      ?.files as { path: string; content_type?: string }[] | undefined;
    if (Array.isArray(files) && files.length > 0) {
      return files
        .filter(
          (f) =>
            f.path &&
            (f.content_type?.startsWith("image/") ||
              /\.(jpg|jpeg|png|webp|gif)$/i.test(f.path))
        )
        .map((f) => ({ path: f.path }));
    }
  }

  // 2. Fast workflow: images are directly on generate_image steps
  const images: { path: string }[] = [];
  for (const stepName of Object.keys(steps)) {
    if (!stepName.startsWith("generate_image")) continue;
    const outputs = steps[stepName].outputs as Record<string, unknown> | undefined;
    const imgList = outputs?.images as { path: string }[] | undefined;
    if (Array.isArray(imgList)) {
      for (const img of imgList) {
        if (img.path) images.push({ path: img.path });
      }
    }
  }
  return images;
}

function extractReportPaths(trajectory: Trajectory) {
  // Reports are collected by select_reports (or legacy "reports") step
  const reportsStep = trajectory.steps?.select_reports ?? trajectory.steps?.reports;
  const files = (reportsStep?.outputs as Record<string, unknown> | undefined)
    ?.files as { path: string }[] | undefined;

  let summaryPath: string | undefined;
  let scoresPath: string | undefined;

  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.path?.endsWith("summary.md")) summaryPath = f.path;
      if (f.path?.endsWith("scores.json")) scoresPath = f.path;
    }
  }

  return { summaryPath, scoresPath };
}

function TrajectoryView({ id }: { id: string }) {
  const { data: trajectory, isLoading, error } = useTrajectory(id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading trajectory...
      </div>
    );
  }

  if (error || !trajectory) {
    return (
      <p className="text-sm text-red-400">
        Failed to load: {error?.message ?? "Not found"}
      </p>
    );
  }

  const images = extractImages(trajectory);
  const { summaryPath, scoresPath } = extractReportPaths(trajectory);
  const isComplete = trajectory.status === "completed";

  return (
    <div className="space-y-6">
      <RunStatusBanner trajectory={trajectory} />

      {images.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-medium">
            Generated images ({images.length})
          </h3>
          <ImageGallery images={images} />
        </section>
      )}

      {isComplete && <JudgeResults trajectory={trajectory} />}

      {isComplete && summaryPath && (
        <section>
          <h3 className="mb-3 text-lg font-medium">Summary report</h3>
          <SummaryReport filePath={summaryPath} />
        </section>
      )}

      {isComplete && scoresPath && (
        <section>
          <h3 className="mb-3 text-lg font-medium">Detailed scores</h3>
          <ScoresTable filePath={scoresPath} />
        </section>
      )}
    </div>
  );
}

export default function RunPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const batchParam = searchParams.get("batch");

  if (!id) {
    return (
      <div className="space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <p className="text-sm text-red-400">No run ID provided.</p>
      </div>
    );
  }

  // Batch mode: multiple trajectory IDs comma-separated
  const trajectoryIds = batchParam
    ? batchParam.split(",").filter(Boolean)
    : [id];

  const isBatch = trajectoryIds.length > 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h2 className="text-xl font-semibold">
          {isBatch
            ? `Batch run (${trajectoryIds.length} prompts)`
            : "Run details"}
        </h2>
      </div>

      {trajectoryIds.map((tid, i) => (
        <div key={tid}>
          {isBatch && (
            <h3 className="mb-3 text-sm font-medium text-neutral-400">
              Run {i + 1} of {trajectoryIds.length}
            </h3>
          )}
          <TrajectoryView id={tid} />
        </div>
      ))}
    </div>
  );
}
