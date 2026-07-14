# CLAUDE.md

## What this is and why

This is Kalyan's live portfolio site, hosted on GitHub Pages at a custom
domain (`kalyanvenk.com`, per `CNAME`). It's the "hub" in the hub-and-spoke
architecture decided on for his projects: `agentic-llmops`, `Inference-Lens`,
and `PredictOps` stay as separate, focused repos, and this site is where the
narrative connecting them lives, alongside a working live demo.

Six pages: `index.html` (home — thesis, stats, a three-card project grid, a
monitoring-delta-vs-capability scatter chart), `about.html`, `inference-
lens.html` (Inference-Lens deep-dive), `agentic-llmops.html` (agentic-llmops
deep-dive), `predictops.html` (PredictOps deep-dive), `play.html` (a
standalone, no-signup "try it live" scorer). Shared assets in `assets/`:
`style.css`, `script.js` (nav/scroll-reveal behavior), `scorer.js`
(hand-written client-side inference), `model.js` (generated, not hand-written
— an 860KB single-line data file holding the actual trained Logistic
Regression and XGBoost parameters, ported out of the Inference-Lens Python
pipeline so they can run in a browser).

**Positioning, as of 2026-07-13**: the site broadened from an "LLM evaluation
and trustworthiness" identity to a broader ML Engineer identity (targeting
Data Scientist, ML Engineer, AI Engineer, and SWE roles), to reflect that
Kalyan's applications aren't confined to the LLM space anymore. The two LLM/
NLP research projects stay as the flagship depth pieces; PredictOps is the
deliberate breadth piece proving the same rigor applies outside LLM work.

**The one architecture decision worth knowing:** the live demo used to embed
a Streamlit app via iframe (commit history: "Native in-browser scorer on the
Inference-Lens page, retires the Streamlit iframe"). It now runs entirely
client-side — `scorer.js` reimplements the exact feature extraction (token
length, type-token ratio, Flesch score, ROUGE-L) and both Logistic Regression
and XGBoost scoring logic in plain JavaScript, reading model parameters out of
`model.js`. DeBERTa is deliberately excluded from this port, consistent with
every other deployment surface for this project (the HF Space and the
Streamlit app in the Inference-Lens repo both exclude it too, since it's slow
to load and was only ever trained on Colab). This means the "try it live"
demo on this site needs no backend, no Streamlit Community Cloud, and no
Hugging Face Space to stay warm — it's fully static. That supersedes an
earlier concern (documented elsewhere) about needing to ping a free-tier app
during launch windows to avoid a cold-start spinner; that mitigation is no
longer needed for this particular demo.

## Current state

- As of 2026-07-13, a content pass landed: `predictops.html` added (new
  project page, honestly framed as 3-of-7 build phases done, no fabricated
  results for phases 4-7 which haven't happened yet), ICSE 2027 removed from
  every page (`index.html`, `about.html`, `agentic-llmops.html` — meta tags,
  eyebrow, trust line, project card tags, and the status section all reworded
  to "under peer review" / "a top-tier venue"), and the homepage + agentic-
  llmops.html scatter/bar charts fixed for Llama 3.1 8B: it now plots the
  real, CI-confirmed (65%, +0.7pp, not statistically significant) point
  instead of the misleading single-trial (72%, -4pp) one, with a caption
  calling out the non-significance explicitly. The "8 model architectures"
  stat got a clarifying label (combined across both research projects,
  not a single-project count). All pages' nav/footer now link `predictops.html`
  too.
- **The reason the ICSE fix could finally ship as a real link, not a "private,
  available on request" placeholder: `agentic-llmops` is now PUBLIC on
  GitHub** (verified via `gh repo view`), so `agentic-llmops.html`'s GitHub
  link is live for anyone. The earlier "dead link" workaround this file used
  to recommend is no longer needed — just the wording fix, which is now done.
- **PredictOps (`kalyan-venk/PredictOps` on GitHub) was flipped from private
  to public as part of this same pass** (with Kalyan's explicit go-ahead) so
  `predictops.html`'s GitHub link isn't dead either.
- **hawk-eye-geospatial got a one-line mention, not a page**, on `about.html`
  and in the `kalyan-venk` README/`PROFILE.md` — deliberately, after verifying
  its actual code state: only Day 1-2 of a planned 10-day build, the dataset
  loader/training loop/serving endpoint are literal `NotImplementedError`
  stubs, and none of its four headline numbers have ever been measured. Adding
  it as a full project card would have violated this site's own "prove it,
  don't claim it" thesis. Kalyan confirmed this call directly (asked, not
  assumed) when presented with the real repo state.
- **Vaultex and GroundTruth are still deliberately excluded**, and this time
  it's confirmed by more than a past planning session's "off-thesis" call —
  both repos were checked directly: GroundTruth has only planning docs, no
  code at all; Vaultex has a bare Spring Boot scaffold (one entrypoint class,
  one empty test, a DB migration baseline) with no real business logic.
  Kalyan also confirmed he's lost the working codebase for both and would be
  rebuilding from scratch, so there is nothing true to publish yet. Don't
  revisit this unless one of them actually gets rebuilt.
- This site's file set is nearly duplicated inside the `Inference-Lens` repo
  under a `website/` directory — that copy is untracked, never committed, and
  now further out of date than before this pass (it doesn't have PredictOps or
  any of the above fixes). Treat *this* repo as the single source of truth for
  the live site.
- The `kalyan-venk` profile README's stale "AUC-ROC target > 0.82" line and
  its own missing-PredictOps/ICSE issues were fixed in the same session, in
  that repo directly — see its own `CLAUDE.md`. `PROFILE.md` in the
  `Inference-Lens` repo got the same treatment for consistency.

## Setup / build / run

No build step. Static HTML/CSS/JS served directly by GitHub Pages from
`main`. To preview locally, just open the HTML files in a browser or run any
static file server from the repo root (e.g. `python3 -m http.server`). Chart.js
is loaded from a CDN (`cdn.jsdelivr.net`) at runtime for the homepage scatter
chart — no local dependency to install.

## Architecture and key decisions

- `index.html` — home page. Hero, four animated stat counters, a three-card
  project grid (Inference-Lens / agentic-llmops / PredictOps), the Chart.js
  scatter plot, a "how I work" feature grid, tag cloud, and a hiring CTA.
- `inference-lens.html` / `agentic-llmops.html` / `predictops.html` — one
  deep-dive page per project, each linking back to its GitHub repo and (for
  Inference-Lens) the live demo. `predictops.html` additionally has an
  explicit phase-by-phase status table (done vs. next) instead of a findings
  narrative, since the project doesn't have a completed research result yet
  — that table is the thing to update as more phases ship.
- `play.html` — the standalone interactive demo. Two textareas, a "load a
  sample pair" button (hardcoded example: a concise correct answer vs. a
  padded, verbose one — deliberately illustrates the project's own finding
  about length bias), and a "score responses" button that calls into
  `scorer.js`.
- `assets/scorer.js` — ports the trained sklearn pipeline to JavaScript by
  hand: reimplements `tokenLength`, `typeTokenRatio`, a Flesch-reading-ease
  calculation via a syllable heuristic, and an LCS-based ROUGE-L, then scores
  with a manually-coded sigmoid-logistic-regression function and a decision-
  tree-array walk for XGBoost. Both read their fitted parameters from
  `window.IL_MODEL`, defined in `assets/model.js`.
- `assets/model.js` — not meant to be read or edited by hand. It's a data
  dump of the trained model (scaler mean/std, logistic regression
  intercept/coefficients, and the full XGBoost tree ensemble as nested
  arrays), generated from the actual trained models in the Inference-Lens
  repo. If Inference-Lens's models are retrained, this file needs to be
  regenerated and re-exported, or the live demo will silently score against
  stale models.
- `about.html` — the fuller bio/background page, consistent with
  `PROFILE.md` in the Inference-Lens repo.

## Open problems / next steps

- There's no documented process for regenerating `assets/model.js` when the
  underlying Inference-Lens models are retrained. Worth writing down the
  export step (or a script) so this file doesn't silently drift out of sync
  with the actual trained models.
- Decide what to do about the stale, uncommitted `website/` copy living
  inside the Inference-Lens repo — now more stale than before (missing
  PredictOps and every fix in this pass), not a risk to this repo directly,
  but confusing clutter pointing at content that actually lives here.
- `predictops.html`'s phase-status table (Phase 4 CI eval gate, Phase 5
  MLflow registry, Phase 6 Evidently drift, Phase 7 wiring) needs updating as
  each phase actually ships — don't let it silently go stale like the
  ICSE/AUC-ROC issues did.
- If Vaultex or GroundTruth ever get rebuilt with real code, revisit adding
  them — GroundTruth in particular has real historical results (a 13M-row
  Criteo A/B-test log, a CUPED variance-reduction result) that a past planning
  session flagged as publishable without rebuilding the code, if Kalyan wants
  to revisit that instead of a full rebuild.
- `Inference-Lens`'s own `README.md` still doesn't have the NLP-positioning
  language that's now live here and in the `kalyan-venk` README — flagged in
  that repo's own `CLAUDE.md` as an open gap, not fixed in this pass.

## Working conventions for this repo

- **Don't let commits attribute to Claude.** Kalyan doesn't want `claude`
  showing up in this repo's GitHub contributors graph since recruiters view
  it. Check for an `attribution` block (empty `commit`/`pr` strings) in
  `.claude/settings.local.json` or the user's global `~/.claude/settings.json`
  before committing here.
- **Keep this file current.** This file, not Cowork's memory system, is meant
  to be the one artifact both Claude Code and Cowork converge on for this
  repo. Update it at the end of any nontrivial session, regardless of which
  Claude surface you're using.
