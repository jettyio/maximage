// Jetty API types

export interface Trajectory {
  trajectory_id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  created: string;
  updated: string;
  error: string | null;
  init_params: {
    vars?: {
      prompt?: string;
      aspect_ratio?: string;
      num_images?: string;
    };
    [key: string]: unknown;
  };
  attributes?: {
    params?: {
      vars?: {
        prompt?: string;
        aspect_ratio?: string;
        num_images?: string;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  steps: Record<string, TrajectoryStep>;
  labels?: { key: string; value: string }[];
}

export interface TrajectoryStep {
  status?: string;
  activity?: string;
  created?: string;
  ended?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export interface TrajectoryListResponse {
  trajectories: Trajectory[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/** Raw response from POST /run */
export interface RawRunResponse {
  message: string;
  workflow_id: string;
  result: Record<string, unknown>;
  trajectory: Record<string, unknown>;
  metadata: string;
}

/** Normalized run response used by the app */
export interface RunResponse {
  trajectory_id: string;
  workflow_id: string;
}

// App-level types

export interface ImageResult {
  path: string;
  stepName: string;
}

export interface JudgeResult {
  judgment: "yes" | "no";
  explanation: string;
}

export interface ScoresJson {
  images: ScoreEntry[];
  aggregate: {
    total_products: number;
    num_images_per_product: number;
    total_variations: number;
    total_attempts: number;
    pass_rate: number;
    avg_rounds: number;
  };
}

export interface ScoreEntry {
  product_number: number;
  variation: string;
  product_description: string;
  variation_prompt: string;
  category: string;
  filename: string;
  aspect_ratio: string;
  rounds: number;
  final_style_judgment: string;
  final_style_explanation: string;
  final_quality_judgment: string;
  final_quality_explanation: string;
  trajectory_id: string;
  used_file_upload: boolean;
}

// Launch form types

export interface LaunchParams {
  prompts: string[];
  num_images: number;
  aspect_ratio: string;
}

export interface BatchRunResponse {
  batch_id: string;
  runs: RunResponse[];
}
