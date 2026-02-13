import { NextRequest, NextResponse } from "next/server";
import { launchRun, launchBatch } from "@/lib/jetty";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompts, prompt, num_images = 1, aspect_ratio = "4:3", mode = "product" } = body;

    // Map mode to task_name for the bench orchestrator
    const task_name = mode === "lifestyle" ? "max-image-lifestyle" : "max-image";

    // Support both single prompt and batch prompts
    const promptList: string[] = prompts
      ? prompts
      : prompt
        ? [prompt]
        : [];

    if (promptList.length === 0) {
      return NextResponse.json(
        { error: "At least one prompt is required" },
        { status: 400 }
      );
    }

    if (promptList.length === 1) {
      const run = await launchRun({
        prompt: promptList[0],
        num_images,
        aspect_ratio,
        task_name,
      });
      return NextResponse.json({
        batch_id: run.trajectory_id,
        runs: [run],
      });
    }

    // Batch: fire all in parallel
    const runs = await launchBatch({ prompts: promptList, num_images, aspect_ratio, task_name });
    // Use the first trajectory_id as the batch_id for navigation
    return NextResponse.json({
      batch_id: runs[0].trajectory_id,
      runs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
