import { NextRequest, NextResponse } from "next/server";
import { launchBatch } from "@/lib/jetty";
import type { ImageMode } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompts,
      prompt,
      num_images = 1,
      aspect_ratio = "4:3",
      mode = "product",
    } = body;

    const imageMode: ImageMode = mode === "lifestyle" ? "lifestyle" : "product";

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

    // Always use batch — expands prompts × num_images into parallel fast runs
    const runs = await launchBatch({
      prompts: promptList,
      num_images,
      aspect_ratio,
      mode: imageMode,
    });

    return NextResponse.json({
      batch_id: runs[0].trajectory_id,
      runs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
