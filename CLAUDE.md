# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Static web app, three files:

- `index.html` (repo root) — markup + inlined CSS (CSS stays inline; it's tightly coupled to the markup).
- `assets/js/questions.js` — the `SCENARIOS` question bank. Loaded first via `<script src="assets/js/questions.js">`.
- `assets/js/app.js` — application logic (rendering, state, exam flow). Loaded second; relies on `SCENARIOS` being already defined as a top-level `const` from `questions.js` (classic scripts share the global declarative scope, so the binding crosses files).

No build step, no dependencies, no backend, no test suite. To run locally, open `index.html` in a browser (`open index.html` on macOS) — `<script src>` works over `file://`, so the "double-click and go" contract is preserved. Deployment is GitHub Pages, driven by `.github/workflows/pages.yml` on push to `main`; the workflow uploads the repo root as the Pages artifact.

## Question bank structure

All questions live in the `SCENARIOS` array in `assets/js/questions.js`. Each scenario object is:

```js
{ id, title, context, questions: [{ q, options: [A,B,C,D], answer: 0-3, explain }] }
```

`answer` is zero-indexed **against the order options are written in source**. The runtime re-shuffles options on every render and remaps `answer` accordingly — so when editing, always write `answer` relative to your own option order and never try to pre-shuffle.

### Scenario ID conventions (load-bearing)

- **IDs 1–6** — the six official exam scenarios. The "Practice Test" flow randomly picks 4 of these and 6 questions from each (24 total), mirroring the real exam's 4-of-6 structure.
- **IDs 7–9** — special sets (Official Questions, Docs Deep Dives, Anti-Pattern Spotter). Each runs in full via its own button, and is excluded from the random draw.

The gate between these two groups is `SPECIAL_SCENARIO_IDS = new Set([7, 8, 9])` defined in `assets/js/app.js`. When adding a new special set, push a new scenario with ID ≥ 7 in `assets/js/questions.js` **and** add the ID to that set in `assets/js/app.js` — otherwise it will be pulled into the random exam draw.

### Adding/editing questions

- Append to the relevant scenario's `questions` array; reload the page to verify.
- New exam scenarios: push onto `SCENARIOS` with the next available ID in the 1–6 range (participates in random draw). For a standalone review set, use ID ≥ 7 and register it in `SPECIAL_SCENARIO_IDS`, then wire a button + init-block entry following the pattern of scenarios 7/8/9.
- Landing-page stats (`#bank-total-q`, button labels) are auto-computed in `init()` from `SCENARIOS` — no manual count updates needed.

## Runtime model

- **State is in-memory only.** `state.usedQuestions` is a Set of `"sid:qi"` keys tracking which questions have been seen this browser session; it resets on reload or via the "Reset Question Pool" button. No localStorage, no cookies, no backend.
- When a scenario's unused pool is smaller than `qsPerScenario`, `buildTest()` backfills from already-seen questions and shows a "pool partially exhausted" note — don't mistake this for a bug.
- Explanations render immediately after each answer is revealed (not batched at the end).

## Editing notes

- The project is dependency-free by design. Do not introduce a build step, package manager, or external/CDN script/CSS dependency unless explicitly asked — it would break the "open index.html and go" contract called out in `README.md`. The local `questions.js` / `app.js` split is fine because both are same-origin static files; adding a third-party CDN or a bundler is not.
- Scope is deliberately limited to the exam guide's task statements. `README.md` ("What this is not") lists topics excluded on purpose (fine-tuning, billing, hosting, embeddings, computer use, vision) — don't add questions in those areas.
