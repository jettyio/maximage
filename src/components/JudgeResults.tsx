"use client";

import { CheckCircle2, XCircle, Minus } from "lucide-react";
import type { Trajectory } from "@/lib/types";

interface JudgeRound {
  round: number;
  stepName: string;
  score: number | null;
  explanation: string | null;
  imagePath: string | null;
  success: boolean;
}

function extractJudgeRounds(trajectory: Trajectory): JudgeRound[] {
  const steps = trajectory.steps;
  if (!steps) return [];

  const rounds: JudgeRound[] = [];
  let roundNum = 1;

  // Look for judge_quality, judge_quality_2, judge_quality_3, etc.
  for (const stepName of Object.keys(steps).sort()) {
    if (!stepName.startsWith("judge_quality")) continue;

    const outputs = steps[stepName].outputs as Record<string, unknown> | undefined;
    if (!outputs) continue;

    const results = outputs.results as {
      score?: number | null;
      explanation?: string | null;
      raw_result?: string | null;
      item?: string | null;
      success?: boolean;
    }[] | undefined;

    const result = results?.[0];
    if (!result) continue;

    // Parse explanation from raw_result if not directly available
    let explanation = result.explanation ?? null;
    if (!explanation && result.raw_result) {
      try {
        const parsed = JSON.parse(result.raw_result);
        explanation = parsed.explanation ?? null;
      } catch {
        // raw_result isn't valid JSON
      }
    }

    let score = result.score ?? null;
    if (score === null && result.raw_result) {
      try {
        const parsed = JSON.parse(result.raw_result);
        score = parsed.score ?? null;
      } catch {
        // ignore
      }
    }

    rounds.push({
      round: roundNum++,
      stepName,
      score,
      explanation,
      imagePath: (result.item as string) ?? null,
      success: result.success ?? false,
    });
  }

  return rounds;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-400/10 px-2 py-0.5 text-xs font-medium text-neutral-400">
        <Minus className="h-3 w-3" />
        N/A
      </span>
    );
  }

  const color =
    score >= 4.5
      ? "bg-green-400/10 text-green-400"
      : score >= 3.5
        ? "bg-yellow-400/10 text-yellow-400"
        : "bg-red-400/10 text-red-400";

  const Icon = score >= 4 ? CheckCircle2 : score >= 3 ? Minus : XCircle;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      <Icon className="h-3 w-3" />
      {score}/5
    </span>
  );
}

export function JudgeResults({ trajectory }: { trajectory: Trajectory }) {
  const rounds = extractJudgeRounds(trajectory);

  if (rounds.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-medium">Quality scores</h3>
      {rounds.map((round) => (
        <div
          key={round.stepName}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-300">
              Round {round.round}
            </span>
            <ScoreBadge score={round.score} />
          </div>
          {round.explanation && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
                Show judge feedback
              </summary>
              <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-400">
                {round.explanation}
              </pre>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}
