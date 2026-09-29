# ATS Resume Scanner

Compare a resume against a job description and see how well they match.

- **Match percentage**
- **Matching keywords** — found in both
- **Missing keywords** — in the job description but not the resume

Everything runs in the browser. The resume is never uploaded anywhere, and there
is no backend, no database, and no API key.

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

## Stack

Vite + React 19 + TypeScript.
