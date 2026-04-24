# Architect Practice Lab

A self-contained, browser-based practice environment for the **Claude Certified Architect — Foundations** exam.

[**→ Open the practice lab**](https://lakkanna.github.io/architect-practice-lab/)

No installation, no server, no data collection. Open the page and start practicing.

---

## What's inside

**291 questions** across nine sections, covering every task statement in the official exam guide:

| Section | Questions | What it is |
|---|---:|---|
| Customer Support Resolution Agent | 36 | Exam Scenario 1 |
| Code Generation with Claude Code | 37 | Exam Scenario 2 |
| Multi-Agent Research System | 37 | Exam Scenario 3 |
| Developer Productivity with Claude | 36 | Exam Scenario 4 |
| Claude Code for CI/CD | 34 | Exam Scenario 5 |
| Structured Data Extraction | 35 | Exam Scenario 6 |
| Official Practice Questions | 25 | The canonical community set from [claudecertifications.com](https://claudecertifications.com/claude-certified-architect/practice-questions) |
| Docs Deep Dives | 33 | Synthesized from [platform.claude.com](https://platform.claude.com/docs/en/home) documentation |
| Anti-Pattern Spotter | 18 | One question per documented anti-pattern — build instant recognition |

Plus an inline **Anti-Patterns Cheatsheet** on the landing page — all 18 common wrong-answer patterns, grouped by domain, severity-coded.

---

## How it works

**Practice Test** randomly draws four of the six exam scenarios and six questions per scenario (24 total), mirroring the real exam's 4-of-6 structure. Question option order is shuffled on every run. The pool tracks which questions you've already seen within a browser session and prefers fresh material until the pool is exhausted.

**Official Questions**, **Docs Deep Dives**, and **Anti-Pattern Spotter** each run their dedicated sets in full, with shuffled order and options.

After each answer, the correct choice is highlighted, the incorrect choice (if any) is marked, and the **explanation appears immediately** — so you learn as you go rather than waiting until the end.

At the end of a session you get a scaled score (100–1000, passing is 720), per-section breakdown, and a review of every missed question with its explanation.

---

## Why this exists

The official exam guide gives five domains, six scenarios, and a handful of sample questions. That's not enough repetition to build real pattern recognition. This repo stitches together:

- Questions written to match every task-statement bullet from the exam guide
- The 25 canonical community practice questions, verbatim
- Deep-dive questions built from the official Claude documentation
- Drill questions covering every documented anti-pattern

Everything is in one HTML file. No build step, no dependencies, no tracking, no backend.

---

## Run locally

```bash
git clone https://github.com/Lakkanna/architect-practice-lab.git
cd architect-practice-lab
open index.html          # macOS
# or: xdg-open index.html  (Linux)
# or: start index.html     (Windows)
```

That's it. The file is fully self-contained — question bank, app logic, and styling all inlined.

---

## Deploy your own copy

**GitHub Pages** (what this repo uses):

1. Fork the repo
2. Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / folder: `/ (root)`
3. Your copy is live at `https://<your-username>.github.io/architect-practice-lab/`

No Actions workflow is required — GitHub Pages will serve `index.html` directly.

If you prefer a GitHub Actions workflow (needed if you add a build step later), the minimal working version is in the appendix below.

**Any static host** (Netlify, Vercel, Cloudflare Pages, S3, your own nginx) works identically — just serve `index.html`.

---

## Customizing the question bank

The entire question bank lives inline in `index.html` inside a single `<script>` block, as a JavaScript array called `SCENARIOS`. Each scenario looks like this:

```javascript
{
  id: 1,
  title: "Customer Support Resolution Agent",
  context: "You are building a customer support resolution agent...",
  questions: [
    {
      q: "The question text…",
      options: ["A option", "B option", "C option", "D option"],
      answer: 0,           // zero-indexed: 0=A, 1=B, 2=C, 3=D
      explain: "Why the correct answer is correct, and why each distractor is wrong."
    },
    // …more questions
  ]
}
```

**To add a question:** find the scenario's `questions` array and append a new object. Reload the page.

**To add a new section:** push a new scenario object onto `SCENARIOS`. IDs 1–6 participate in the random exam draw. IDs 7+ are "special" review sets that only appear via their dedicated buttons — add their ID to the `SPECIAL_SCENARIO_IDS` set near the bottom of the script if you want the same treatment.

The app automatically randomizes option order on every render and remaps the correct-answer index, so you never need to worry about shuffling; just write the options in any order and set `answer` to the correct index in that order.

---

## What this is not

- **Not an official Anthropic product.** This is a community study aid. The exam guide, official practice set, and documentation are the authoritative sources.
- **Not a guarantee.** Answering everything here correctly does not guarantee you pass. The real exam includes scenario-based reasoning that requires judgment, not just memorization.
- **Not a dumping ground.** Every question was either sourced from official/community material verbatim or written to map to a specific task-statement bullet from the exam guide. Out-of-scope topics (fine-tuning, billing, hosting, embeddings, computer use, vision) are deliberately excluded.

---

## Contributing

Issues and PRs welcome, especially:

- **Corrections** — if you spot a factually wrong answer or a misleading explanation
- **Missing coverage** — a task-statement bullet you think is under-tested
- **Typos and clarity** — question wording that's ambiguous or awkward

Please reference the specific source (exam guide section, docs page URL, etc.) in your PR description so reviewers can verify.

---

## Sources

- **Exam guide:** `Claude Certified Architect – Foundations Certification Exam Guide` (Anthropic)
- **Official practice questions:** [claudecertifications.com/claude-certified-architect/practice-questions](https://claudecertifications.com/claude-certified-architect/practice-questions)
- **Anti-patterns cheatsheet:** [claudecertifications.com/claude-certified-architect/anti-patterns](https://claudecertifications.com/claude-certified-architect/anti-patterns)
- **Documentation:** [platform.claude.com/docs](https://platform.claude.com/docs/en/home)

All trademarks belong to their respective owners. "Claude" is a trademark of Anthropic, PBC.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Appendix: Minimal GitHub Actions workflow (optional)

If your current workflow is failing and you want to replace it with a known-good minimal version, drop this into `.github/workflows/pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then in repo **Settings → Pages → Source**, switch from "Deploy from a branch" to **"GitHub Actions"**. Push to `main` and the workflow will deploy.

Common causes of failing Pages Actions builds:

- **Source mismatch.** If Pages is set to "Deploy from a branch" but you also have an Actions workflow that runs `actions/deploy-pages`, the two can conflict. Pick one — the workflow above assumes you've set Source to "GitHub Actions".
- **Missing permissions.** The workflow needs `pages: write` and `id-token: write` at the job or workflow level.
- **Wrong artifact path.** `upload-pages-artifact` expects the directory containing your `index.html`. For a single-file repo at the root, that's `.`.
- **Branch protection.** If `main` is protected and the workflow's `GITHUB_TOKEN` can't push, the deploy step fails silently.

Paste the failing step's logs into an issue if none of those fix it.
