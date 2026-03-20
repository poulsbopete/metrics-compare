# GitHub Pages vs Vercel

| What | Where |
|------|--------|
| **Metrics-compare Next.js app** | **Vercel** (full SSR, `/api/*`, OpenTelemetry) |
| **Static slides** (`slides/` in git) | **GitHub Pages** |

## Slides on GitHub Pages

Workflow: [`.github/workflows/deploy-slides.yml`](../.github/workflows/deploy-slides.yml) (**GitHub Pages — slides only**)

- **Triggers:** every push to `main` (so the live site is never stuck on an old artifact), or **Actions → GitHub Pages — slides only → Run workflow** for a manual redeploy.
- If you previously deployed a **Next.js `out/`** build to Pages, run this workflow once (or push any commit to `main`) to overwrite it with `slides/` only.
- **Repo settings:** **Pages → Source:** **GitHub Actions**.

After a successful run, slides are served from:

`https://<user>.github.io/<repo>/`

Example: `https://poulsbopete.github.io/metrics-compare/` → root is whatever is in `slides/` (e.g. `slides/index.html`).

## App on Vercel

Connect the repo to Vercel and deploy the **root** of the project (default Next.js preset). No GitHub Pages workflow is needed for the app.
