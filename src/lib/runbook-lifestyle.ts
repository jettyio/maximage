/**
 * Runbook instruction for the max-image lifestyle workflow.
 * This gets POSTed as init_params.instruction when launching a run.
 *
 * Template variables (substituted at runtime by the runbook step):
 *   {{prompt}}       — Product/scene description(s) to generate
 *   {{num_images}}   — Number of variations per product (default: 1, max: 8)
 *   {{aspect_ratio}} — Aspect ratio for images (default: 3:4)
 */
export const LIFESTYLE_RUNBOOK = `# Lifestyle & Editorial Product Image Generation Task

Generate lifestyle and editorial product/beauty photographs that match the aesthetic of premium lifestyle brands (think Glossier, Aesop, Nike lifestyle campaigns, Goop editorial). You will use the existing \`jettyio/max-image-lifestyle-gen\` workflow on Jetty, evaluate results using its built-in judge system, and iteratively refine prompts to achieve quality targets.

## Objective

1. Run the \`jettyio/max-image-lifestyle-gen\` workflow to generate \`{{num_images}}\` variations of each product description
2. Each image variation gets its own independent hill-climbing journey (up to 3 rounds)
3. Review judge feedback from the workflow's built-in quality evaluator
4. For beauty/fashion shots, ensure diverse model representation across variations
5. Save final images and generate a comprehensive summary report

## Parameters

| Parameter | Template Variable | Default | Max | Description |
|-----------|------------------|---------|-----|-------------|
| Number of images | \`{{num_images}}\` | 1 | 8 | How many variations to generate per product description |
| Aspect ratio | \`{{aspect_ratio}}\` | \`3:4\` | — | Aspect ratio for all generated images (\`3:4\` portrait for lifestyle/beauty) |
| Product prompt | \`{{prompt}}\` | — | — | Product/scene description(s) to generate |

When \`num_images\` > 1, each image should be a **distinct variation** of the same subject — vary the prompt wording, lighting mood, background color/texture, or (for beauty) the model's appearance. All variations follow the same style guide, but no two images should look identical.

## Available Workflow

**Task**: \`jettyio/max-image-lifestyle-gen\` (collection: \`jettyio\`)

### Workflow Steps

1. **craft_prompt** — Expands your product/scene description into a detailed editorial image generation prompt via an art director LLM
2. **generate_image** — Generates the image using \`gemini-3-pro-image-preview\`
3. **judge_quality** — Evaluates photographic quality, editorial style, and mood (realism, materials, lighting, composition, cohesion)

### Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| \`prompt\` | string | Product/scene description or refined generation prompt |
| \`aspect_ratio\` | string | Use \`{{aspect_ratio}}\` from the bench parameters |

### Outputs (from trajectory)

| Path | Description |
|------|-------------|
| \`.steps.generate_image.outputs.images[0].path\` | Storage path to the generated image |
| \`.steps.judge_quality.outputs.results[0].judgment\` | \`"yes"\` (pass) or \`"no"\` (fail) |
| \`.steps.judge_quality.outputs.results[0].explanation\` | Detailed quality and style feedback |

### Running the Workflow

\`\`\`bash
# Start a workflow run (async)
curl -X POST "https://flows-api.jetty.io/api/v1/run/jettyio/max-image-lifestyle-gen" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN" \\
  -F "bakery_host=https://dock.jetty.io" \\
  -F 'init_params={"prompt": "YOUR PROMPT HERE", "aspect_ratio": "3:4"}'

# Poll for completion (typically 30-60 seconds)
curl "https://flows-api.jetty.io/api/v1/db/trajectory/jettyio/max-image-lifestyle-gen/{TRAJECTORY_ID}" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN"

# Download generated image
curl -o image.jpg "https://flows-api.jetty.io/api/v1/file/{IMAGE_PATH}" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN"
\`\`\`

### File Upload for Image Editing

When refining an image that is close to passing, you can upload the previous image along with a revised prompt:

\`\`\`bash
curl -X POST "https://flows-api.jetty.io/api/v1/run/jettyio/max-image-lifestyle-gen" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN" \\
  -F "bakery_host=https://dock.jetty.io" \\
  -F 'init_params={"prompt": "Same scene but fix: warmer lighting, more visible product label", "aspect_ratio": "3:4"}' \\
  -F "files=@previous_image.jpg"
\`\`\`

## The Visual Style Guide

Generated images MUST match ALL of the following lifestyle/editorial characteristics:

### Background & Environment

- **Rich environmental context**: colored backdrops, textured surfaces, natural settings, or styled scenes
- **NEVER white/plain studio backgrounds** — every image must have intentional environmental context
- **Surfaces and settings welcome**: marble countertops, wooden tables, fabric backgrounds, outdoor scenes, bathroom shelves, vanity setups

### Lighting & Mood

- **Natural or editorial lighting** with intentional mood: golden hour warmth, soft window light, dramatic directional studio light, candlelit warmth
- **Color temperature is intentional**: warm amber for luxury, cool blue for clinical/fresh, mixed for editorial drama
- **Shadows add dimension**: natural shadows from window light, soft gradient shadows, never clinical flat lighting

### Subject & Composition

- **Product is the hero but shown IN CONTEXT** — on a surface, held by a person, in a scene
- **Close-ups and detail shots encouraged**: beauty close-ups, product textures, hands holding products
- **Editorial composition**: rule of thirds, intentional depth of field, cinematic framing
- **Multiple items in a scene is fine** for product groupings/flatlays (on colored surfaces, NOT white)

### Color Palette

Rich, intentional color palette that establishes mood. Warm amber, cool blue, earth tones, jewel tones. No clinical white, no neon.

### Human Presence (Beauty/Fashion Shots)

- **Authentic models** with realistic skin texture (visible pores, natural shine)
- **Natural expressions** — not overly posed stock-photo smiles
- **Product interaction is natural**: holding, applying, wearing
- **Diverse representation** across variations (ethnicity, hair, skin tone, age 20s-40s)

### Quality Standards

- High material fidelity — product labels legible, surface materials realistic
- No AI artifacts: correct finger count, no garbled text, no uncanny valley
- Magazine-quality: could appear in Vogue, GQ, or a premium brand campaign
- Styled but not over-produced — aspirational yet attainable

## Model Diversity (Beauty/Fashion Shots)

For on-model beauty and fashion shots, **actively vary the models** across generations to reflect diverse, inclusive casting. Each variation should feature a visually distinct person.

Vary across variations:
- **Ethnicity & skin tone**: East Asian, South Asian, Black, Middle Eastern, Latin American, White, mixed heritage
- **Hair**: Straight, curly, coiled, braided, short, long, various natural colors
- **Body type**: Slim, athletic, medium, plus-size
- **Age range**: 20s-40s

When refining a specific variation across hill-climbing rounds, keep the model description consistent. But each variation of the same product should feature a different model.

## Product Descriptions to Generate

{{prompt}}

Use aspect ratio \`{{aspect_ratio}}\` for all images. Default is \`3:4\` (portrait) for lifestyle — this works better for beauty close-ups and editorial shots.

## Agent Workflow

### Step 1: Setup

- Create \`/app/results/\` directory for all outputs
- Parse the product/scene descriptions from \`{{prompt}}\` — there may be one or many (separated by newlines or numbered)
- Read \`{{num_images}}\` (default: 1, max: 8) — this is how many **variations** to generate per product description
- Read \`{{aspect_ratio}}\` (default: \`3:4\`) — the aspect ratio for all images

### Step 2: Generate Variations (per product)

For each product description, generate \`{{num_images}}\` image variations. Each variation should differ in prompt emphasis — for example:
- Different lighting mood or color temperature (golden hour vs cool blue vs candlelit)
- Different background color/texture/surface (marble vs wood vs fabric vs outdoor)
- For beauty: different model descriptions (ethnicity, hair, build) per variation
- Different composition style (close-up vs medium shot vs environmental)

Each variation is **independent** — it gets its own workflow run and its own hill-climbing journey.

For each variation:

1. **Craft a variation prompt**: Take the base product/scene description and add variation-specific details
2. **Run the workflow**: Call \`jettyio/max-image-lifestyle-gen\` with the variation prompt and \`{{aspect_ratio}}\`
3. **Poll for completion**: Check trajectory status every 15-30 seconds until \`status\` is \`"completed"\`
4. **Read judge results**: Extract the judge's \`judgment\` and \`explanation\` from the trajectory
5. **Download the image**: Save to \`/app/results/\` with a descriptive filename (e.g., \`01a_beauty_closeup.jpg\`, \`01b_beauty_closeup.jpg\`)

### Step 3: Iterative Refinement (max 3 rounds per variation)

Each variation has its own independent hill-climbing journey. If **the judge returns \`"no"\` (fail)**:

1. **Analyze the feedback**: Read the judge's explanation to identify specific issues
2. **Refine the prompt**: Rewrite the variation prompt to explicitly address the identified problems
3. **Re-run the workflow** with the refined prompt. If the image was close to passing, consider uploading the previous image via file upload for Gemini to edit rather than regenerating from scratch.
4. **Re-evaluate**: Check the new judge results
5. **Repeat** up to 3 total attempts per variation (1 initial + 2 refinements)
6. **Keep the best result**: If no attempt passes, save the image from the attempt with the most positive feedback

**Refinement strategy**:
- Address the most critical failures first (composition, lighting mood > minor texture issues)
- For beauty shots, ensure the model description is specific and detailed
- If the same issue persists across attempts, try a fundamentally different prompt approach
- When an image is close to passing, use file upload to edit rather than regenerate from scratch
- Read the judge explanation carefully — it lists specific criteria that passed or failed
- You can run multiple variations in parallel — start all workflow runs, then poll for results

### Step 4: Summary Report

After all products are processed, generate two output files:

#### \`/app/results/summary.md\`

A comprehensive summary report containing:

1. **Results table** (one row per variation):

| # | Variation | Product | Filename | Quality | Rounds | Notes |
|---|-----------|---------|----------|---------|--------|-------|
| 1 | 1a | Beauty close-up | 01a_beauty.jpg | PASS | 1 | First attempt |
| 2 | 1b | Beauty close-up | 01b_beauty.jpg | PASS | 2 | Fixed lighting on retry |

2. **Aggregate metrics**:
   - Total variations generated (products x \`{{num_images}}\`)
   - Total workflow runs (including refinement attempts)
   - Final pass rate (judge pass): X/N variations
   - Average rounds needed per variation

3. **Common failure patterns**: What issues came up most frequently

4. **Lessons learned**: What prompt strategies worked best

#### \`/app/results/scores.json\`

Structured data for programmatic analysis:

\`\`\`json
{
  "images": [
    {
      "product_number": 1,
      "variation": "a",
      "product_description": "Beauty close-up: woman holding skincare jar...",
      "variation_prompt": "Beauty close-up with warm amber lighting...",
      "category": "beauty",
      "filename": "01a_beauty_closeup.jpg",
      "aspect_ratio": "3:4",
      "rounds": 1,
      "final_quality_judgment": "yes",
      "final_quality_explanation": "...",
      "trajectory_id": "abc123",
      "used_file_upload": false
    }
  ],
  "aggregate": {
    "total_products": 1,
    "num_images_per_product": 2,
    "total_variations": 2,
    "total_attempts": 3,
    "pass_rate": 0.83,
    "avg_rounds": 1.5
  }
}
\`\`\`

This summary report is collected by the workflow's \`select_reports\` step, so ensure it is saved to \`/app/results/summary.md\` before the task completes.

## Scoring Targets

| Metric | Target | Minimum Acceptable |
|--------|--------|--------------------|
| Quality Pass Rate | 100% | 80% |
| Variations needing 0 refinement | 50%+ | 30%+ |

## Output

Save all results to \`/app/results/\`:
- Generated images (final best version for each variation, named \`{NN}{letter}_{description}.jpg\`)
- \`summary.md\` — comprehensive report with results table, aggregate metrics, and lessons learned
- \`scores.json\` — structured per-variation data with judge results and trajectory IDs

## CRITICAL: Performance Rules

- **Do NOT use TodoWrite** — it wastes time. Track progress mentally, not with tools.
- **Do NOT use ToolSearch** — you already know all the tools you need (Bash, Write).
- **Polling strategy**: Wait 40 seconds before first poll, then poll every 10 seconds. Do NOT use \`sleep 20\` or \`sleep 30\` — workflows typically complete in 45-55 seconds.
- **Be concise**: Skip explanations and commentary. Just execute the workflow steps efficiently.
- **Launch all variations in parallel first**, then poll for all of them.

## Tips

- **The workflow handles prompt crafting internally** — your product/scene description gets expanded by an art director LLM before generation. But for refinement rounds, you can pass a more detailed/specific prompt directly.
- **Workflows take 45-55 seconds** — launch multiple in parallel by starting them all, then poll after 40s, then every 10s.
- **Judge explanations are your refinement roadmap** — read them carefully to understand what to fix.
- **For beauty shots, be very specific about the model** — include ethnicity, build, hair description, and pose. Vary these across products.
- **Default aspect ratio is \`3:4\` (portrait)** for lifestyle — this works better for beauty close-ups and editorial shots.
- **The trajectory \`.steps\` is an object keyed by step name**, not an array.
- **If a workflow fails** (status \`"failed"\`), retry with the same prompt once before attempting a different approach.
- **File upload is most useful** when an image is 80% there — wrong lighting mood, slightly off composition, etc. For images with fundamental issues, regenerating from scratch is faster.
- **Parallelism**: When generating multiple variations, launch all workflow runs first, then poll for results. This dramatically reduces total time.
`;
