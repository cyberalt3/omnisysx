# `omnisysx/web/`

Static web dashboard + documentation site. No build step — just open `OmnisysX.html` in any browser.

## Files

| File | Purpose |
|------|---------|
| `OmnisysX.html` | Main app entry — dashboard with portfolio, pipeline, ops console |
| `docs.html` | Documentation entry — sidebar nav + 14 doc pages |
| `omnisysx-app.jsx` | Root React component for the dashboard |
| `omnisysx-atoms.jsx` | Reusable components (Btn, Pill, Logo, Section) |
| `omnisysx-bg.jsx` | Interactive background with mascot parallax |
| `omnisysx-header-hero.jsx` | Header + hero section |
| `omnisysx-portfolio.jsx` | Portfolio dashboard section |
| `omnisysx-pipeline.jsx` | 6-stage pipeline section |
| `omnisysx-ops.jsx` | Operations console (chat + runs) |
| `omnisysx-data.jsx` | Mock data for demo mode |
| `docs-app.jsx` | Docs site app (sidebar + content + TOC) |
| `docs-content.jsx` | All 14 doc pages as JSX |
| `assets/omnisysx-mascot.png` | The star mascot character |

## Run locally

Just double-click `OmnisysX.html` and your browser opens it. That's it.

For a slightly nicer dev experience (auto-reload):

```bash
# Option 1 — Python's built-in
python3 -m http.server 8000

# Option 2 — Node's `serve`
npx serve .
```

Then open `http://localhost:8000`.

## Deploy

This is a static site. Drop the entire `web/` folder into:

- **Vercel** — drag onto vercel.com, set root directory to `web/`
- **Netlify** — drag-drop deploy
- **GitHub Pages** — push to `gh-pages` branch
- **Cloudflare Pages** — connect this repo, set output dir to `omnisysx/web/`

For a custom domain, point your DNS at the host and set the root.

## How it works

- React 18 loaded via CDN
- JSX transpiled in-browser via `@babel/standalone`
- All styles inline in `OmnisysX.html` and `docs.html`
- Zero build step, zero npm install — works straight from the file

This means the entire frontend is **viewable, hackable, and deployable as plain text files**. Perfect for hackathon submissions and forks.
