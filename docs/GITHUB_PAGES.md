# GitHub Pages vs Vercel

| What | Where |
|------|--------|
| **Metrics-compare Next.js app** | **Vercel** (full SSR, `/api/*`, OpenTelemetry) |
| **Static slides** (`slides/` in git) | **GitHub Pages** |

## Slides on GitHub Pages

Workflow: [`.github/workflows/deploy-slides.yml`](../.github/workflows/deploy-slides.yml)

- **Triggers:** pushes to `main` that change files under `slides/`, or **Actions → Deploy Slides to GitHub Pages → Run workflow** (manual redeploy).
- **Repo settings:** **Pages → Source:** **GitHub Actions**.

After a successful run, slides are served from:

`https://<user>.github.io/<repo>/`

Example: `https://poulsbopete.github.io/metrics-compare/` → root is whatever is in `slides/` (e.g. `slides/index.html`).

## App on Vercel

Connect the repo to Vercel and deploy the **root** of the project (default Next.js preset). No GitHub Pages workflow is needed for the app.
