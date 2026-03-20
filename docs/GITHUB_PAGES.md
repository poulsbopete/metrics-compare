# GitHub Pages

The **Next.js app** is deployed as a **static export** on every push to `main` via [`.github/workflows/github-pages.yml`](../.github/workflows/github-pages.yml).

## Setup (one-time)

1. Repo **Settings → Pages**
2. **Build and deployment → Source:** **GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` or run the workflow manually (**Actions → Deploy to GitHub Pages → Run workflow**).

After the first successful run, the site is at:

`https://<user>.github.io/<repo>/`

Example: `https://poulsbopete.github.io/metrics-compare/`

## Limitations (static host)

- **`/api/*` routes are not included** on GitHub Pages (no Node server). Trace-test and health APIs exist only on [Vercel](https://o11y-compare.vercel.app/) (or other full Next hosts).
- **OpenTelemetry `instrumentation.ts`** does not run in the browser bundle the same way as on Vercel.

## Local static build

```bash
export GITHUB_PAGES=true
export BASE_PATH=/metrics-compare   # match your GitHub repo name
rm -rf app/api   # restore from git after: git checkout -- app/api
npm run build
npx serve out
```

Restore API routes after testing: `git checkout -- app/api`

## Slides

Optional files under `slides/` are copied to `out/slides/` during CI so they remain available at `.../<repo>/slides/`.
