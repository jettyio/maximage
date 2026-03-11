"use client";

import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Trajectory } from "@/lib/types";

const config = {
  pending: {
    icon: Clock,
    label: "Pending",
    bg: "bg-yellow-900/20 border-yellow-700/50",
    text: "text-yellow-300",
  },
  running: {
    icon: Loader2,
    label: "Running",
    bg: "bg-blue-900/20 border-blue-700/50",
    text: "text-blue-300",
    spin: true,
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    bg: "bg-green-900/20 border-green-700/50",
    text: "text-green-300",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    bg: "bg-red-900/20 border-red-700/50",
    text: "text-red-300",
  },
} as const;

export function RunStatusBanner({
  trajectory,
}: {
  trajectory: Trajectory;
}) {
  const cfg =
    config[trajectory.status as keyof typeof config] ?? config.pending;
  const Icon = cfg.icon;

  const completedSteps = Object.values(trajectory.steps ?? {}).filter(
    (s) => s.status === "completed"
  ).length;
  const totalSteps = Object.keys(trajectory.steps ?? {}).length;

  return (
    <div className={`rounded-lg border px-4 py-3 ${cfg.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={`h-5 w-5 ${cfg.text} ${"spin" in cfg && cfg.spin ? "animate-spin" : ""}`}
          />
          <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
          {totalSteps > 0 && (
            <span className="text-sm text-neutral-400">
              ({completedSteps}/{totalSteps} steps)
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-neutral-500">
          {trajectory.trajectory_id}
        </span>
      </div>
      {(() => {
        const prompt =
          trajectory.init_params?.vars?.prompt ??
          (trajectory.init_params?.prompt as string | undefined);
        return prompt ? (
          <p className="mt-1.5 text-sm text-neutral-300">{prompt}</p>
        ) : null;
      })()}
    </div>
  );
}
