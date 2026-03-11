# maximage

A web front-end for [max-image](https://flows.jetty.io) -- launch premium e-commerce product and lifestyle image generation runs, track progress in real time, and review results in an image gallery with quality scores.

**Live at [maximage.jetty.bot](https://maximage.jetty.bot)**

## What it does

maximage wraps fast Jetty workflows (`max-image-product-fast` and `max-image-lifestyle-fast`) that generate photorealistic images using Gemini, then evaluate each image against a style guide with an AI judge. Every run does 2 rounds: generate + judge, then automatic prompt refinement + regenerate + re-judge.

This app lets you:

- **Launch runs** with a product description, number of images (1-8), and aspect ratio
- **Two modes** -- Product (studio white-background photography) and Lifestyle (editorial/environmental photography)
- **Batch prompts** -- enter multiple product descriptions (one per line) and they all fire off in parallel
- **Multiple images** -- requesting N images launches N parallel workflow runs, each producing one image with natural variation
- **Monitor progress** -- each run polls for status every 5 seconds, showing step-by-step completion
- **Browse results** -- completed runs display images in a responsive gallery with a full-screen lightbox
- **Quality scores** -- judge scores (1-5) for each generation round with expandable feedback

## Architecture

```
Browser  -->  Next.js API Routes  -->  Jetty Flows API
                (token stays here)      (runs workflows, stores files)
```

The app is stateless. All data lives on Jetty -- the Next.js API routes proxy requests and keep the API token server-side. The client polls for updates using `@tanstack/react-query`.

### Workflow design

Every run uses the same code path regardless of mode or image count:

- **1 prompt, 1 image** → 1 fast workflow run
- **1 prompt, N images** → N parallel fast runs
- **M prompts, N images** → M×N parallel fast runs

Each fast workflow run executes 6 steps in sequence:
1. `craft_prompt` — Art director LLM expands the description into a detailed generation prompt
2. `generate_image` — Gemini generates the image
3. `judge_quality` — AI judge scores the image 1-5
4. `refine_prompt` — LLM rewrites the prompt based on judge feedback
5. `generate_image_2` — Gemini regenerates with the refined prompt
6. `judge_quality_2` — Final quality score

### Project structure

```
src/
  app/
    page.tsx                    # Home: launch form + run history table
    run/[id]/page.tsx           # Run detail: status, gallery, scores
    api/
      run/route.ts              # POST -- launch runs (expands prompts × num_images)
      trajectories/route.ts     # GET -- list recent runs
      trajectory/[id]/route.ts  # GET -- single run detail
      file/route.ts             # GET -- proxy file downloads (images)
      webhook/route.ts          # POST -- receive Jetty webhook notifications
  components/
    LaunchForm.tsx              # Prompt textarea, mode toggle, num_images, aspect_ratio
    RunHistory.tsx              # Recent runs table with status badges
    RunStatusBanner.tsx         # Status + step progress for a single run
    ImageGallery.tsx            # Responsive image grid
    ImageLightbox.tsx           # Full-screen viewer (arrow keys, Esc)
    JudgeResults.tsx            # Quality scores per round with expandable feedback
    SummaryReport.tsx           # Renders summary.md via react-markdown
    ScoresTable.tsx             # Aggregate metrics + per-image judge results
  hooks/
    useTrajectory.ts            # Poll a single trajectory (5s while running)
    useTrajectories.ts          # Fetch recent trajectories (10s refresh)
  lib/
    jetty.ts                    # Server-side Jetty API client
    types.ts                    # TypeScript types for Jetty API + app
```

### Jetty tasks

| Task | Mode | Description |
|------|------|-------------|
| `jettyio/max-image-product-fast` | Product | Studio product photography — white backgrounds, isolated subjects |
| `jettyio/max-image-lifestyle-fast` | Lifestyle | Editorial lifestyle photography — environmental context, models, mood |

Workflow definitions are in `workflow-product-fast.json` and `workflow-lifestyle-fast.json`.

### Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **@tanstack/react-query** for polling and caching
- **react-markdown** + **remark-gfm** for rendering summary reports
- **lucide-react** for icons
- Deployed on **Vercel**

## Setup

### Prerequisites

- Node.js 18+
- A Jetty API token with access to the `jettyio` collection

### Local development

```bash
git clone git@github.com:jettyio/maximage.git
cd maximage
npm install

# Create .env.local with your Jetty API token
cp .env.local.example .env.local
# Edit .env.local and set JETTY_API_TOKEN=mlc_...

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

```bash
vercel link
vercel env add JETTY_API_TOKEN production   # paste your token when prompted
vercel --prod
```

## API routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/run` | Launch run(s). Body: `{ prompts: string[], num_images: number, aspect_ratio: string, mode: "product" \| "lifestyle" }`. Expands to prompts × num_images parallel fast runs. |
| `GET` | `/api/trajectories` | List recent runs. Query: `?limit=20&page=1` |
| `GET` | `/api/trajectory/[id]` | Get full trajectory detail including steps, outputs, and judge results. |
| `GET` | `/api/file?path=...` | Proxy file download from Jetty storage (images). Streams with correct content-type. |
| `POST` | `/api/webhook` | Receive webhook notifications from Jetty (logs to console). |

## License

Private -- Jetty internal use.
