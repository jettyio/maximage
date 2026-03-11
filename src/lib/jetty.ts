import type {
  Trajectory,
  TrajectoryListResponse,
  RawRunResponse,
  RunResponse,
  ImageMode,
} from "./types";
import { PRODUCT_RUNBOOK } from "./runbook-product";
import { LIFESTYLE_RUNBOOK } from "./runbook-lifestyle";

const FLOWS_API = "https://flows-api.jetty.io/api/v1";
const COLLECTION = "jettyio";

const TASK_MAP: Record<ImageMode, { task: string; runbook: string }> = {
  product: { task: "max-image-product", runbook: PRODUCT_RUNBOOK },
  lifestyle: { task: "max-image-lifestyle", runbook: LIFESTYLE_RUNBOOK },
};

function getToken(): string {
  const token = process.env.JETTY_API_TOKEN;
  if (!token) throw new Error("JETTY_API_TOKEN is not set");
  return token;
}

function headers(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}` };
}

/** Launch a single run, POSTing the runbook instruction inline */
export async function launchRun(params: {
  prompt: string;
  num_images: number;
  aspect_ratio: string;
  mode?: ImageMode;
  webhook_url?: string;
}): Promise<RunResponse> {
  const mode = params.mode ?? "product";
  const { task, runbook } = TASK_MAP[mode];

  const body = new FormData();
  body.append("bakery_host", "https://dock.jetty.io");

  const initParams: Record<string, unknown> = {
    instruction: runbook,
    vars: {
      prompt: params.prompt,
      num_images: String(params.num_images),
      aspect_ratio: params.aspect_ratio,
    },
  };
  if (params.webhook_url) {
    initParams.webhook_url = params.webhook_url;
  }
  body.append("init_params", JSON.stringify(initParams));

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

  // workflow_id is like "jettyio-max-image-product--8534af33"
  // trajectory_id is the part after "--"
  const parts = raw.workflow_id.split("--");
  const trajectory_id = parts[parts.length - 1];

  return { trajectory_id, workflow_id: raw.workflow_id };
}

/** Launch a batch of runs in parallel */
export async function launchBatch(params: {
  prompts: string[];
  num_images: number;
  aspect_ratio: string;
  mode?: ImageMode;
  webhook_url?: string;
}): Promise<RunResponse[]> {
  const results = await Promise.allSettled(
    params.prompts.map((prompt) =>
      launchRun({
        prompt,
        num_images: params.num_images,
        aspect_ratio: params.aspect_ratio,
        mode: params.mode,
        webhook_url: params.webhook_url,
      })
    )
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    throw new Error(`Run ${i} failed: ${r.reason}`);
  });
}

const ALL_TASKS = [TASK_MAP.product.task, TASK_MAP.lifestyle.task];

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

/** List recent trajectories from both tasks, merged and sorted */
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

/** Get a single trajectory (tries both tasks) */
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
