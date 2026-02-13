import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/lib/jetty";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const upstream = await downloadFile(path);
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = upstream.body;

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
