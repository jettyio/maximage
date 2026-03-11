import type {
  Trajectory,
  TrajectoryListResponse,
  RawRunResponse,
  RunResponse,
  ImageMode,
} from "./types";

const FLOWS_API = "https://flows-api.jetty.io/api/v1";
const COLLECTION = "jettyio";

/** Fast workflow tasks — one run = one image, no agent overhead */
const FAST_TASK: Record<ImageMode, string> = {
  product: "max-image-product-fast",
  lifestyle: "max-image-lifestyle-fast",
};

/** Legacy agent tasks — kept for fetching old trajectories */
const LEGACY_TASKS = ["max-image-product", "max-image-lifestyle"];

const ALL_TASKS = [...Object.values(FAST_TASK), ...LEGACY_TASKS];

function getToken(): string {
  const token = process.env.JETTY_API_TOKEN;
  if (!token) throw new Error("JETTY_API_TOKEN is not set");
  return token;
}

function headers(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}` };
}

/** Launch a single fast workflow run (produces 1 image). */
export async function launchRun(params: {
  prompt: string;
  aspect_ratio: string;
  mode?: ImageMode;
}): Promise<RunResponse> {
  const mode = params.mode ?? "product";
  const task = FAST_TASK[mode];

  const body = new FormData();
  body.append("bakery_host", "https://dock.jetty.io");
  body.append(
    "init_params",
    JSON.stringify({
      prompt: params.prompt,
      aspect_ratio: params.aspect_ratio,
    })
  );

  const res = await fetch(`${FLOWS_API}/run/${COLLECTION}/${task}`, {
    method: "POST",
    headers: headers(),
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to launch run: ${res.status} ${text}`);
  }

  const raw: RawRunResponse = await res.json();

  // workflow_id is like "jettyio-max-image-product-fast--8534af33"
  // trajectory_id is the part after "--"
  const parts = raw.workflow_id.split("--");
  const trajectory_id = parts[parts.length - 1];

  return { trajectory_id, workflow_id: raw.workflow_id };
}

/** Launch multiple runs in parallel (one per prompt × num_images). */
export async function launchBatch(params: {
  prompts: string[];
  num_images: number;
  aspect_ratio: string;
  mode?: ImageMode;
}): Promise<RunResponse[]> {
  // Expand: each prompt gets num_images parallel runs
  const jobs: { prompt: string }[] = [];
  for (const prompt of params.prompts) {
    for (let i = 0; i < params.num_images; i++) {
      jobs.push({ prompt });
    }
  }

  const results = await Promise.allSettled(
    jobs.map((job) =>
      launchRun({
        prompt: job.prompt,
        aspect_ratio: params.aspect_ratio,
        mode: params.mode,
      })
    )
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    throw new Error(`Run ${i} failed: ${r.reason}`);
  });
}

/** Fetch a single page of trajectories for a specific task */
async function fetchTrajectoriesPage(
  task: string,
  limit: number,
  page: number
): Promise<TrajectoryListResponse> {
  const res = await fetch(
    `${FLOWS_API}/db/trajectories/${COLLECTION}/${task}?limit=${limit}&page=${page}`,
    { headers: headers(), next: { revalidate: 0 } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list trajectories: ${res.status} ${text}`);
  }

  return res.json();
}

/** List recent trajectories from all tasks, merged and sorted */
export async function listTrajectories(
  limit = 200,
  page = 1
): Promise<TrajectoryListResponse> {
  const PAGE_SIZE = 50;
  const perTask = Math.min(limit, PAGE_SIZE);

  const results = await Promise.allSettled(
    ALL_TASKS.map((task) => fetchTrajectoriesPage(task, perTask, page))
  );

  const all: Trajectory[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value.trajectories);
    }
  }

  all.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return {
    trajectories: all.slice(0, limit),
    total: all.length,
    page,
    limit,
    has_more: false,
  };
}

/** Get a single trajectory (tries all tasks) */
export async function getTrajectory(
  trajectoryId: string
): Promise<Trajectory> {
  for (const task of ALL_TASKS) {
    try {
      const res = await fetch(
        `${FLOWS_API}/db/trajectory/${COLLECTION}/${task}/${trajectoryId}`,
        { headers: headers(), next: { revalidate: 0 } }
      );
      if (res.ok) return res.json();
    } catch {
      continue;
    }
  }
  throw new Error(`Trajectory ${trajectoryId} not found`);
}

/** Download a file from Jetty storage — returns the Response for streaming */
export async function downloadFile(path: string): Promise<Response> {
  const res = await fetch(`${FLOWS_API}/file/${path}`, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status}`);
  }

  return res;
}
