# Study Panda Companion

Here are all the APIs used by studypanda.xyz:

Base API — `https://api.pimaxer.in/v2`

| Purpose | Endpoint |

|---|---|

| Batches list | `GET /v1/batches?page=1&limit=200` (live public API) |

| Batch details (subjects list) | `GET /v2/batches/{batchId}/details` |

| Topics (per subject) | `GET /v2/batches/{batchId}/subject/{subjectId}/topics` |

| Lectures / Videos list | `GET /v2/batches/{batchId}/subject/{subjectId}/content?page=1&contentType=Videos&tag={topicId}` |

| Notes | `GET /v2/batches/{batchId}/subject/{subjectId}/content?page=1&contentType=Notes&tag={topicId}` |

| DPPs (DPP Notes/PDFs) | `GET /v2/batches/{batchId}/subject/{subjectId}/content?page=1&contentType=DppNotes&tag={topicId}` |

| Tests | `GET /v2/batches/{batchId}/subject/{subjectId}/content?page=1&contentType=Test&tag={topicId}` |

| Generic content list | `GET /v2/batches/{batchId}/subject/{subjectId}/content?page=1&contentType={type}&tag={topicId}` |

Video playback (HLS proxy / DRM helper)

- `https://flat-moon-3350.bhanuyadav.workers.dev/?batchId={batchId}&subjectId=ABC&childId={lectureId}`

- HLS.js: `https://cdn.jsdelivr.net/npm/hls.js`

Frontend route flow (mirrors the API)

```

/batches

  → /batches/{batchId}                          (details)

  → /batches/{batchId}/subject/{subjectId}      (topics)

  → …/topic/{topicId}                            (content list: videos/notes/dpp/test)

  → …/lecture/{lectureId}                        (player)

```

The `contentType` param is the switch for lectures / notes / DPPs / tests / batch content list. Known values: `Videos`, `Notes`, `DppNotes`, `Test`.

if some api lrft ectract from studypanda.xyz and create a website

take overview of ui only from lite.learntopper.in

## Cloudflare Deployment

This application is built with TanStack Start and Nitro, configured with native **Cloudflare Pages** support (using Cloudflare's Edge runtime and `nodejs_compat`).

### Build & Deploy Commands

#### 1. Build Command

```bash
npm run build
```

This compiles the application and generates the Cloudflare Pages bundle in the `dist` directory with `_worker.js`, `_routes.json`, and optimized static assets.

#### 2. Local Preview with Cloudflare Edge Runtime

```bash
npm run preview:cf
# Or directly:
npx wrangler pages dev dist
```

#### 3. Deploy to Cloudflare Pages via CLI (Wrangler)

```bash
# Build and deploy in a single step
npm run deploy:prod

# Or if already built:
npm run deploy
# Which executes:
npx wrangler pages deploy dist
```

_Note: If deploying for the first time via CLI, Wrangler will ask you to authorize your Cloudflare account and choose or create a Pages project name (e.g. `study-ace`)._

#### 4. Deploy via Cloudflare Dashboard / Git Integration

If you connect your GitHub repository to Cloudflare Pages in the Cloudflare Dashboard:

- **Framework Preset**: `None` / `Custom`
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Node.js Version**: `20` or higher
- **Compatibility Flags**: `nodejs_compat` (already preset via `wrangler.json`)

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bad62219-1dff-4d98-a392-c8d87aba6931).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
