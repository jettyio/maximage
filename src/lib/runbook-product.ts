/**
 * Runbook instruction for the max-image product workflow.
 * This gets POSTed as init_params.instruction when launching a run,
 * rather than being baked into the Jetty task definition.
 *
 * Template variables (substituted at runtime by the runbook step):
 *   {{prompt}}       — Product description(s) to generate
 *   {{num_images}}   — Number of variations per product (default: 1, max: 8)
 *   {{aspect_ratio}} — Aspect ratio for images (default: 4:3)
 */
export const PRODUCT_RUNBOOK = `# Premium E-Commerce Product Image Generation Task

Generate photorealistic product and fashion images that match the premium e-commerce aesthetic of a curated DTC marketplace (think Ssense, Need Supply, Goop). You will use the existing \`jettyio/max-image-gen\` workflow on Jetty, evaluate results using its built-in dual-judge system, and iteratively refine prompts to achieve quality targets.

## Objective

1. Run the \`jettyio/max-image-gen\` workflow to generate \`{{num_images}}\` variations of each product description
2. Each image variation gets its own independent hill-climbing journey (up to 3 rounds)
3. Review judge feedback from the workflow's built-in style and quality evaluators
4. For fashion/on-model shots, ensure diverse model representation across generations
5. Save final images and generate a comprehensive summary report

## Parameters

| Parameter | Template Variable | Default | Max | Description |
|-----------|------------------|---------|-----|-------------|
| Number of images | \`{{num_images}}\` | 1 | 8 | How many variations to generate per product description |
| Aspect ratio | \`{{aspect_ratio}}\` | \`4:3\` | — | Aspect ratio for all generated images (\`4:3\` for products, \`3:4\` for fashion) |
| Product prompt | \`{{prompt}}\` | — | — | Product description(s) to generate |

When \`num_images\` > 1, each image should be a **distinct variation** of the same subject — vary the prompt wording, angle emphasis, styling details, or (for fashion) the model's appearance. All variations still follow the same style guide, but no two images should look identical.

## Available Workflow

**Task**: \`jettyio/max-image-gen\` (collection: \`jettyio\`)

### Workflow Steps

1. **craft_prompt** — Expands your product description into a detailed image generation prompt via an art director LLM
2. **generate_image** — Generates the image using \`gemini-3-pro-image-preview\`
3. **judge_quality** — Evaluates photographic quality and style compliance (realism, materials, lighting, composition, cohesion)

### Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| \`prompt\` | string | Product description or refined generation prompt |
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
curl -X POST "https://flows-api.jetty.io/api/v1/run/jettyio/max-image-gen" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN" \\
  -F "bakery_host=https://dock.jetty.io" \\
  -F 'init_params={"prompt": "YOUR PROMPT HERE", "aspect_ratio": "4:3"}'

# Poll for completion (typically 30-60 seconds)
curl "https://flows-api.jetty.io/api/v1/db/trajectory/jettyio/max-image-gen/{TRAJECTORY_ID}" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN"

# Download generated image
curl -o image.jpg "https://flows-api.jetty.io/api/v1/file/{IMAGE_PATH}" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN"
\`\`\`

### File Upload for Image Editing

The workflow supports file uploads. When refining an image that is close to passing, you can upload the previous image along with a revised prompt. When an input image is provided, Gemini can edit the existing image rather than generating from scratch — preserving good elements while fixing specific issues.

\`\`\`bash
curl -X POST "https://flows-api.jetty.io/api/v1/run/jettyio/max-image-gen" \\
  -H "Authorization: Bearer $JETTY_API_TOKEN" \\
  -F "bakery_host=https://dock.jetty.io" \\
  -F 'init_params={"prompt": "Same product but fix: make background pure white, soften the shadow edges", "aspect_ratio": "4:3"}' \\
  -F "files=@previous_image.jpg"
\`\`\`

Use file upload when:
- An image is close to passing but has specific fixable issues (shadow direction, background color)
- You want to preserve the overall composition while refining details
- Starting from scratch with prompt-only refinement isn't producing better results

## The Visual Style Guide

Generated images MUST match ALL of the following characteristics. This is a precise visual language — every attribute matters.

### Background & Environment

- **Pure white to very faint warm grey background** (#F5F5F2 to #FFFFFF). No colored backgrounds, gradients, or environmental context whatsoever.
- **No visible surface, floor, or horizon line.** The subject floats on white with only a shadow to imply grounding.
- **No props, lifestyle elements, or secondary objects.** The only exception is items integral to the subject (e.g., a basketball held by an athlete).

### Lighting & Shadows

- **Soft, diffused studio lighting** from the upper-left, wrapping evenly around the subject. The lighting comes from large softboxes — no harsh point-source lighting, no dramatic rim lighting.
- **Every subject casts a soft, natural drop shadow** falling to the lower-right. The shadow is medium-opacity, never black, and diffused at the edges.
- **No harsh specular highlights.** Even glossy surfaces (metal, leather, glass) show controlled, soft reflections — not blown-out hotspots.

### Subject & Composition

- **Single subject isolation.** Exactly one product or one person per image.
- **Three-quarter angle presentation** for products. Not flat front-on, not pure profile.
- **Full-body framing for fashion/people shots.** Head near the top, feet near the bottom, no cropping at limbs.
- **Generous negative space on all sides.** The subject occupies roughly 50-70% of the frame area.
- **Subject is never cropped by the frame edge.** The entire object is visible with clear margins.

### Color Palette

The overall palette is **muted, desaturated, and organic.** No neon, no electric blues, no synthetic-feeling hues.

- **Neutrals:** Black leather, cream, oatmeal/beige, camel/tan, charcoal, grey wool, kraft brown
- **Warm accents:** Coral-pink, warm red, honey/amber yellow, gold hardware, brushed gold
- **Cool accents:** Sky blue, powder blue, olive/sage green, teal
- **Metallics:** Gold hardware, brushed aluminum, chrome/stainless steel (always subtle)

### Material & Texture Fidelity

- **High material fidelity.** You must be able to perceive the grain of leather, the loops of bouclé fabric, the matte finish of ceramic, the brushed surface of aluminum.
- **Matte-to-satin surface rendering.** The overall feel is tactile quality, not high-gloss commercial.
- **No text overlays, watermarks, price tags, or graphic design elements.** Only incidental product branding is acceptable.

### What This Style Is NOT

- Not basic Amazon white-background shots (too flat, too lit, no shadow artistry)
- Not high-concept editorial (no dramatic lighting, no colored gels)
- Not lifestyle photography (no tables, surfaces, plants, or background contexts)
- Not 3D renders (must look photographic, not CGI-clean)
- Not flat-lay (objects are presented dimensionally, not overhead)

## Model Diversity (Fashion Shots)

For on-model fashion shots, **actively vary the models** across generations to reflect diverse, inclusive casting. This is both a creative and business requirement — premium brands feature diverse representation.

When crafting or refining prompts for fashion shots, vary these attributes across your product set:

- **Ethnicity & skin tone**: East Asian, South Asian, Black, Middle Eastern, Latin American, White, mixed heritage
- **Facial features**: Range of face shapes, nose shapes, lip fullness, eye shapes
- **Hair**: Straight, curly, coiled, braided, short, long, various natural colors
- **Body type**: Slim, athletic, medium, plus-size (while maintaining the editorial aesthetic)
- **Age range**: Young adult through middle-aged (20s–40s)
- **Gender presentation**: Masculine, feminine, androgynous as appropriate for the garment

Each fashion image should feature a visually distinct person. When refining a specific fashion prompt across iterations, keep the model description consistent for that product, but ensure variety across different products.

## Product Descriptions to Generate

{{prompt}}

Use aspect ratio \`{{aspect_ratio}}\` for all images. If the product description indicates a fashion/on-model shot and the aspect ratio is \`4:3\`, you may override to \`3:4\` for better framing.

## Agent Workflow

### Step 1: Setup

- Create \`/app/results/\` directory for all outputs
- Parse the product descriptions from \`{{prompt}}\` — there may be one or many (separated by newlines or numbered)
- Read \`{{num_images}}\` (default: 1, max: 8) — this is how many **variations** to generate per product description
- Read \`{{aspect_ratio}}\` (default: \`4:3\`) — the aspect ratio for all images

### Step 2: Generate Variations (per product)

For each product description, generate \`{{num_images}}\` image variations. Each variation should differ in prompt emphasis — for example:
- Different angle or framing emphasis ("slightly angled left" vs "three-quarter right")
- Different material/texture focus ("emphasize the leather grain" vs "emphasize the stitching detail")
- For fashion: different model descriptions (ethnicity, hair, build) per variation
- Different styling adjectives or lighting nuances

Each variation is **independent** — it gets its own workflow run and its own hill-climbing journey.

For each variation:

1. **Craft a variation prompt**: Take the base product description and add variation-specific details
2. **Run the workflow**: Call \`jettyio/max-image-gen\` with the variation prompt and \`{{aspect_ratio}}\`
3. **Poll for completion**: Check trajectory status every 15-30 seconds until \`status\` is \`"completed"\`
4. **Read judge results**: Extract the judge's \`judgment\` and \`explanation\` from the trajectory
5. **Download the image**: Save to \`/app/results/\` with a descriptive filename (e.g., \`01a_black_sneaker.jpg\`, \`01b_black_sneaker.jpg\`)

### Step 3: Iterative Refinement (max 3 rounds per variation)

Each variation has its own independent hill-climbing journey. If **the judge returns \`"no"\` (fail)**:

1. **Analyze the feedback**: Read the judge's explanation to identify specific issues
2. **Refine the prompt**: Rewrite the variation prompt to explicitly address the identified problems. Be specific — if the judge says "background is not pure white," add explicit instructions about white background. If lighting is wrong, specify "soft diffused lighting from upper-left with gentle drop shadow to lower-right."
3. **Re-run the workflow** with the refined prompt. If the image was close to passing, consider uploading the previous image via file upload for Gemini to edit rather than regenerating from scratch.
4. **Re-evaluate**: Check the new judge results
5. **Repeat** up to 3 total attempts per variation (1 initial + 2 refinements)
6. **Keep the best result**: If no attempt passes both judges, save the image from the attempt with the most positive feedback

**Refinement strategy**:
- Address the most critical failures first (background, composition > minor texture issues)
- For fashion shots, ensure the model description is specific and detailed
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
| 1 | 1a | Black leather sneaker | 01a_sneaker.jpg | PASS | 1 | First attempt |
| 2 | 1b | Black leather sneaker | 01b_sneaker.jpg | PASS | 2 | Fixed shadow on retry |
| 3 | 2a | Designer armchair | 02a_armchair.jpg | FAIL | 3 | Shadow issues persisted |
| ... | ... | ... | ... | ... | ... | ... | ... |

2. **Aggregate metrics**:
   - Total variations generated (products x \`{{num_images}}\`)
   - Total workflow runs (including refinement attempts)
   - Final pass rate (judge pass): X/N variations
   - Average rounds needed per variation
   - Variations that required all 3 rounds

3. **Category breakdown**: Pass rates by product category

4. **Common failure patterns**: What issues came up most frequently

5. **Lessons learned**: What prompt strategies worked best, what was hardest to achieve, and recommendations for improving the workflow

#### \`/app/results/scores.json\`

Structured data for programmatic analysis:

\`\`\`json
{
  "images": [
    {
      "product_number": 1,
      "variation": "a",
      "product_description": "Black leather low-top sneaker...",
      "variation_prompt": "Black leather low-top sneaker with emphasis on leather grain texture...",
      "category": "footwear",
      "filename": "01a_sneaker.jpg",
      "aspect_ratio": "4:3",
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

- **The workflow handles prompt crafting internally** — your product description gets expanded by an art director LLM before generation. But for refinement rounds, you can pass a more detailed/specific prompt directly.
- **Workflows take 45-55 seconds** — launch multiple in parallel by starting them all, then poll after 40s, then every 10s.
- **Judge explanations are your refinement roadmap** — read them carefully to understand what to fix.
- **For fashion shots, be very specific about the model** — include ethnicity, build, hair description, and pose. Vary these across products.
- **Aspect ratio**: Use \`{{aspect_ratio}}\` for all images. Override to \`3:4\` for fashion/on-model if the passed value is \`4:3\`.
- **The trajectory \`.steps\` is an object keyed by step name**, not an array.
- **If a workflow fails** (status \`"failed"\`), retry with the same prompt once before attempting a different approach.
- **File upload is most useful** when an image is 80% there — wrong shadow direction, slightly off background color, etc. For images with fundamental composition problems, regenerating from scratch is faster.
- **Parallelism**: When generating multiple variations, launch all workflow runs first, then poll for results. This dramatically reduces total time.
`;
