import type {
  Trajectory,
  TrajectoryListResponse,
  RawRunResponse,
  RunResponse,
} from "./types";

const FLOWS_API = "https://flows-api.jetty.io/api/v1";
const COLLECTION = "jettyio";
const TASK = "max-image-bench";

function getToken(): string {
  const token = process.env.JETTY_API_TOKEN;
  if (!token) throw new Error("JETTY_API_TOKEN is not set");
  return token;
}

function headers(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}` };
}

/** Launch a single bench run */
export async function launchRun(params: {
  prompt: string;
  num_images: number;
  aspect_ratio: string;
  task_name?: string;
  webhook_url?: string;
}): Promise<RunResponse> {
  const body = new FormData();
  body.append("bakery_host", "https://dock.jetty.io");

  const initParams: Record<string, unknown> = {
    vars: {
      prompt: params.prompt,
      num_images: String(params.num_images),
      aspect_ratio: params.aspect_ratio,
    },
  };
  if (params.task_name) {
    initParams.task_name = params.task_name;
  }
  if (params.webhook_url) {
    initParams.webhook_url = params.webhook_url;
  }
  body.append("init_params", JSON.stringify(initParams));

  const res = await fetch(`${FLOWS_API}/run/${COLLECTION}/${TASK}`, {
    method: "POST",
    headers: headers(),
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to launch run: ${res.status} ${text}`);
  }

  const raw: RawRunResponse = await res.json();

  // workflow_id is like "jettyio-max-image-bench--8534af33"
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
  task_name?: string;
  webhook_url?: string;
}): Promise<RunResponse[]> {
  const results = await Promise.allSettled(
    params.prompts.map((prompt) =>
      launchRun({
        prompt,
        num_images: params.num_images,
        aspect_ratio: params.aspect_ratio,
        task_name: params.task_name,
        webhook_url: params.webhook_url,
      })
    )
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    throw new Error(`Run ${i} failed: ${r.reason}`);
  });
}

/** Fetch a single page of trajectories */
async function fetchTrajectoriesPage(
  limit: number,
  page: number
): Promise<TrajectoryListResponse> {
  const res = await fetch(
    `${FLOWS_API}/db/trajectories/${COLLECTION}/${TASK}?limit=${limit}&page=${page}`,
    { headers: headers(), next: { revalidate: 0 } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list trajectories: ${res.status} ${text}`);
  }

  return res.json();
}

/** List recent trajectories, paginating automatically to reach the requested count */
export async function listTrajectories(
  limit = 200,
  page = 1
): Promise<TrajectoryListResponse> {
  const PAGE_SIZE = 50;

  if (limit <= PAGE_SIZE) {
    return fetchTrajectoriesPage(limit, page);
  }

  const allTrajectories: Trajectory[] = [];
  let currentPage = page;
  let remaining = limit;
  let total = 0;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, PAGE_SIZE);
    const data = await fetchTrajectoriesPage(batchSize, currentPage);
    total = data.total;
    allTrajectories.push(...data.trajectories);
    remaining -= data.trajectories.length;
    currentPage++;

    if (!data.has_more || data.trajectories.length === 0) break;
  }

  return {
    trajectories: allTrajectories,
    total,
    page,
    limit,
    has_more: allTrajectories.length < total,
  };
}

/** Get a single trajectory */
export async function getTrajectory(
  trajectoryId: string
): Promise<Trajectory> {
  const res = await fetch(
    `${FLOWS_API}/db/trajectory/${COLLECTION}/${TASK}/${trajectoryId}`,
    { headers: headers(), next: { revalidate: 0 } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get trajectory: ${res.status} ${text}`);
  }

  return res.json();
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
