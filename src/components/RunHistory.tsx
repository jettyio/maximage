"use client";

import Link from "next/link";
import { useTrajectories } from "@/hooks/useTrajectories";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  running: {
    icon: Loader2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    spin: true,
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
} as const;

function ModeBadge({ taskName }: { taskName?: string }) {
  const isLifestyle = taskName === "max-image-lifestyle";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isLifestyle
          ? "bg-purple-400/10 text-purple-400"
          : "bg-blue-400/10 text-blue-400"
      }`}
    >
      {isLifestyle ? "Lifestyle" : "Product"}
    </span>
  );
}

export function RunHistory() {
  const { data, isLoading, error } = useTrajectories();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading runs...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load runs: {error.message}
      </p>
    );
  }

  const trajectories = data?.trajectories ?? [];

  if (trajectories.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No runs yet. Launch one above.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 bg-neutral-900/50 text-left text-neutral-400">
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Mode</th>
            <th className="px-4 py-2.5 font-medium">Prompt</th>
            <th className="px-4 py-2.5 font-medium">Created</th>
            <th className="px-4 py-2.5 font-medium">ID</th>
          </tr>
        </thead>
        <tbody>
          {trajectories.map((t) => {
            const cfg =
              statusConfig[t.status as keyof typeof statusConfig] ??
              statusConfig.pending;
            const Icon = cfg.icon;
            const prompt =
              t.init_params?.vars?.prompt ?? "(no prompt)";
            const taskName = t.init_params?.task_name as string | undefined;

            return (
              <tr
                key={t.trajectory_id}
                className="border-b border-neutral-800/50 transition-colors hover:bg-neutral-900/50"
              >
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    <Icon
                      className={`h-3 w-3 ${"spin" in cfg && cfg.spin ? "animate-spin" : ""}`}
                    />
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <ModeBadge taskName={taskName} />
                </td>
                <td className="max-w-xs truncate px-4 py-2.5 text-neutral-200">
                  <Link
                    href={`/run/${t.trajectory_id}`}
                    className="hover:text-blue-400 hover:underline"
                  >
                    {prompt.length > 80
                      ? prompt.slice(0, 80) + "..."
                      : prompt}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-neutral-400">
                  {new Date(t.created).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">
                  {t.trajectory_id.slice(0, 8)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
