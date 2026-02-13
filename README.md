# maximage

A web front-end for [max-image-bench](https://flows.jetty.io) -- launch premium e-commerce product image generation runs, track progress in real time, and review results in an image gallery with summary reports and quality scores.

**Live at [maximage.jetty.bot](https://maximage.jetty.bot)**

## What it does

maximage wraps the `jettyio/max-image-bench` workflow on Jetty. The workflow generates photorealistic product images using Gemini, then evaluates each image against a premium e-commerce style guide with dual AI judges (style compliance + photographic quality). Images that fail are iteratively refined up to 3 rounds.

This app lets you:

- **Launch runs** with a product description, number of image variations (1-8), and aspect ratio
- **Batch prompts** -- enter multiple product descriptions (one per line) and they all fire off in parallel
- **Monitor progress** -- each run polls for status every 5 seconds, showing step-by-step completion
- **Browse results** -- completed runs display images in a responsive gallery with a full-screen lightbox
- **Read reports** -- the summary report (markdown) and scores table (pass/fail per judge, rounds needed) render inline

## Architecture

```
Browser  -->  Next.js API Routes  -->  Jetty Flows API
                (token stays here)      (runs workflows, stores files)
```

The app is stateless. All data lives on Jetty -- the Next.js API routes proxy requests and keep the API token server-side. The client polls for updates using `@tanstack/react-query`.

### Project structure

```
src/
  app/
    page.tsx                    # Home: launch form + run history table
    run/[id]/page.tsx           # Run detail: status, gallery, report, scores
    api/
      run/route.ts              # POST -- launch single or batch runs
      trajectories/route.ts     # GET -- list recent runs
      trajectory/[id]/route.ts  # GET -- single run detail
      file/route.ts             # GET -- proxy file downloads (images, reports)
      webhook/route.ts          # POST -- receive Jetty webhook notifications
  components/
    LaunchForm.tsx              # Prompt textarea, num_images, aspect_ratio
    RunHistory.tsx              # Recent runs table with status badges
    RunStatusBanner.tsx         # Status + step progress for a single run
    ImageGallery.tsx            # Responsive image grid
    ImageLightbox.tsx           # Full-screen viewer (arrow keys, Esc)
    SummaryReport.tsx           # Renders summary.md via react-markdown
    ScoresTable.tsx             # Aggregate metrics + per-image judge results
  hooks/
    useTrajectory.ts            # Poll a single trajectory (5s while running)
    useTrajectories.ts          # Fetch recent trajectories (10s refresh)
  lib/
    jetty.ts                    # Server-side Jetty API client
    types.ts                    # TypeScript types for Jetty API + app
```

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
| `POST` | `/api/run` | Launch run(s). Body: `{ prompts: string[], num_images: number, aspect_ratio: string }`. Batch prompts fire in parallel. |
| `GET` | `/api/trajectories` | List recent runs. Query: `?limit=20&page=1` |
| `GET` | `/api/trajectory/[id]` | Get full trajectory detail including steps, outputs, and judge results. |
| `GET` | `/api/file?path=...` | Proxy file download from Jetty storage (images, reports). Streams with correct content-type. |
| `POST` | `/api/webhook` | Receive webhook notifications from Jetty (logs to console). |

## How a run works

1. You submit a prompt (or batch of prompts) with image count and aspect ratio
2. The app calls `POST /run/jettyio/max-image-bench` on the Jetty Flows API
3. The workflow spins up a sandboxed agent that:
   - Generates image variations using `jettyio/max-image-gen` (Gemini image generation + art director LLM)
   - Evaluates each image with dual judges (style compliance + photographic quality)
   - Iteratively refines failing images up to 3 rounds
   - Produces a `summary.md` report and `scores.json` with per-image results
4. The app polls the trajectory every 5 seconds until completion
5. Results render: images in a gallery, report as rendered markdown, scores in a table with pass/fail badges

## License

Private -- Jetty internal use.
