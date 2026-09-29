# ATS Resume Scanner

Compare a resume against a job description and see how well they match.

- **Match percentage**
- **Matching keywords** — found in both
- **Partly covered** — the words appear, but not as the phrase the posting uses
- **Missing keywords** — in the job description but not the resume

Paste the text, pick a file, or drop one on the box. PDF, Word (`.docx`), and
plain text are supported.

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
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

## How matching works

The scan is plain text processing — no API, no model, no network call.

1. **Extract** text from the resume and job description (`lib/extractText.ts`)
2. **Tokenize**, keeping technology names such as `Node.js`, `CI/CD`, and `C++`
   in one piece (`lib/tokenize.ts`)
3. **Stem** each word so that "managing" and "management" match
   (`lib/stem.ts`)
4. **Extract keywords** from the job description as single words and two- or
   three-word phrases, weighted by how often they appear, which section they
   appear under, and whether they read like the name of a technology
   (`lib/keywords.ts`)
5. **Score** the resume as the share of that keyword weight it covers, so
   missing something the posting stresses costs more than missing something
   mentioned once in passing (`lib/scan.ts`)

A term the resume contains counts in full. A phrase whose words appear, but
not together as the phrase, earns half credit at most.

## Stack

Vite + React 19 + TypeScript, with Vitest for the matching logic.
