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

- **2026-07-19: site-wide copy + naming + humanization pass.**
  - **Rename:** "Multi-Agent Reliability" -> "Multi-Agent Inference Reliability" everywhere
    (nav, cards, footer, blueprints); the agentic page h1 stays the longer "Multi-Agent
    Inference Reliability Framework". The long nav label forced the nav onto 2 lines, so
    `.nav-links a` is now `font-size:.84rem; padding:7px 11px; white-space:nowrap`,
    `.nav-links` gap 2px, and `.brand{white-space:nowrap}` (style.css bumped to `?v=4`).
    It now fits on 1 line through ~1140px; below 860px the hamburger takes over.
  - **Graduation:** he graduated June 2026 (it is now July). Removed future-tense "I graduate
    June 2026" / "graduating June 2026"; now "I just finished my MS/Masters this June".
  - **Numbers as numerals:** every spelled count 2-10 -> digit sitewide, plus count-form
    "one" (one problem/benchmark/per model/etc.) -> 1. LEFT alone on purpose: idiomatic/
    pronoun "one" ("one of", "the cheap one", "which one") and technical terms `one-hot`,
    `one-line` -- converting those reads as broken English. Flag to Kalyan if he wants those too.
  - **Humanized** ~25 AI-slop lines (aphorisms, staccato drama, negative parallelisms,
    "the X, not the Y") across index/about/inference-lens/agentic/predictops/job-scanner,
    via a review agent that flagged exact old->new rewrites (kept his first-person voice).
  - **Home:** h1 "Making AI and ML systems you can actually trust" -> "Multi-Agent Systems &
    Reliability"; eyebrow "ML Engineer..." -> "Research Engineer"; CTA band "Hiring for ML or
    AI Engineering?" -> "Hiring a research engineer?".
  - **About:** kickers "Where I have done it"->"Work", "Toolkit"->"Day to day", "Get in
    touch"->"Contact details"; "Let us talk"->"Feel free to hit me up at"; "Email me"->"Email";
    Evaluation skill box gained HumanEval+ and MBPP; Selected work gained a 4th card (Job
    Scanner, now a 2x2 grid) and PredictOps card fixed from "in progress" to "shipped"; lead
    roles line broadened to "roles in AI and ML: Research Engineer, Data Scientist, ...".
  - **Inference-Lens:** "4 ways to fool a judge" is now a real 2x2 (was 3+1).
  - **STILL "ML Engineer" (flag):** the `<title>` and og/twitter meta on several pages still
    say "ML Engineer, AI Systems That Hold Up" -- positioning decision, not yet aligned to
    "Research Engineer". Also predictops.html h2 "All seven phases shipped" (now "All 7...")
    remains checklist-y in framing.
- **2026-07-19: blueprint overflow auto-clamp + routing + copy pass.**
  - **Text overflow is now impossible in blueprints:** `render()` tags every node text with
    `data-avail` (box inner width) and `clampText(svg)` (run in `mount()` after render, on
    rAF, and on `document.fonts.ready`) sets `textLength`+`lengthAdjust` on any line wider
    than its box, condensing it to fit. So don't hand-tune font sizes for fit anymore; the
    clamp handles it. (Fixed the reported 04/08/HH-RLHF overflows in the Inference-Lens
    system map.)
  - **Removed cross-box connectors** that arced over other boxes (their auto-dots looked
    like dots flying over a box): Inference-Lens `mdls→app` and `setup→mlruns`, and
    Multi-Agent `agentpy→track`. Those nodes now stand alone (they're off the main lineage:
    the serving app, the MLflow-setup script, the tracking DB). Rule: only connect adjacent
    boxes; no long diagonal/cross-band edges.
  - **Home hero:** eyebrow "ML Engineer · AI systems that hold up" -> "Research Engineer";
    h1 "Making AI and ML systems you can actually trust" -> "Multi-Agent Systems & Reliability".
    NOTE: the `<title>`/og/twitter meta still say "ML Engineer" - left as-is (positioning
    decision), flag to Kalyan if he wants those aligned to "Research Engineer".
  - **PredictOps "7/7 build phases shipped" retired** (reads like a progress report, not a
    portfolio flex). Replaced the hero stat + index card metric with the CI eval gate
    (>=0.80 ROC-AUC, "a bad model fails CI"); eyebrow -> "CI-gated & drift-monitored". Still
    checklist-y and NOT changed: predictops.html h2 "All seven phases shipped." and the
    og/twitter titles "all 7 phases shipped" - offer to reframe.
  - Also fixed a leftover "+4.85pp / above 65% harmful" style claim on the home Multi-Agent
    card (now the +30 / ~60% framing).
- **2026-07-19: blueprint polish pass.** (1) All three blueprint heroes now read
  "System design & Code map Visuals" (was "The whole project, drawn twice"). (2) Fixed
  `(AST)` text overflowing the `src/agent.py` box in the Multi-Agent Reliability code map
  (dropped "(AST)", shrank those 5 lines to size 10). (3) **Dead connector lines fixed:**
  the animator (`animate()`) now auto-adds a subtle muted packet to any edge NOT already
  covered by a `spec.flow` route, so every connector (including the dashed secondary ones
  like `agent.py → tracking.db`, config feeds, baseline bypass) has a flowing dot — no more
  static dot-less lines. Dashed = supporting/secondary link (config read, metrics logged,
  baseline control); solid = main data flow. (4) **Preview-thumbnail dots** on the project
  pages now use `<animateMotion path="...">` so they ride the actual connector curves
  instead of animating cx/cy off-line (the old amber dot floated). If you touch the preview
  SVGs, keep dots on `animateMotion path=` matching a real connector `d`.
- **2026-07-19: removed gitignored/internal notes from the blueprints + fixed band-label
  overflow.** Bug: the code-map "meta/docs" boxes listed `CLAUDE.md`, `MISTAKES.md`,
  `DISCREPANCIES.md`, `Kickstart.md`, `PROFILE.md` — all **gitignored/local-only** (they
  aren't in the public repos, and DISCREPANCIES documents the inflated numbers). **Never
  list those on the public site.** Now the meta boxes show only genuinely public files:
  Inference-Lens = pyproject/requirements/Makefile/README/LICENSE; Multi-Agent Reliability =
  README + notebooks/ (Colab); PredictOps = README only (and its footer no longer cites
  CLAUDE.md). Separately, SVG **band labels were overflowing their bands** (e.g.
  "DATA LINEAGE · artifact → artifact" ran past the ~278px band into META). Fix: band labels
  are now short category names only ("DATA LINEAGE", "src/predictops", "RESULTS", etc.) —
  render() draws band labels with no width clipping, so keep them short. All three blueprints
  re-verified in-browser: no text escapes any node/band box.
- **2026-07-19: purged the +4.85pp / p=0.010 claim site-wide and reframed on the
  CI-confirmed endpoints.** Kalyan flagged +4.85pp as wrong. Confirmed against the repo:
  the paper's Phase-3 headline (+4.85pp, "all 9 conditions positive", CI [+3.36,+6.34],
  p=0.010) is **not reproducible from committed data** (`DISCREPANCIES.md`) — the committed
  Phase-3 CSVs give **mean +1.37pp, range −0.33 to +4.33, 2 of 9 conditions negative**.
  It's also a **single-phase, single-model** number (Llama 3.2 3B) that PROFILE/resume were
  presenting as an across-study gain. Removed all 6 site occurrences (agentic hero stat box,
  section-sub, Phase-3 timeline; index card metric; about.html ×2) and reframed on the
  **CI-confirmed** inverse-capability endpoints (Code Llama 7B +30.3pp p=0.002; Qwen2.5
  Coder 7B −4.0pp p=0.020, from `phase7_ci_summary.csv`).
  - **The ~65% "crossover" was never calculated** — `limitations.tex` calls it an
    extrapolation from two confirmed endpoints (20% benefit, 90% harm); 65% is just the
    measured baseline of Llama 3.1 8B (which shows +0.7pp, *not significant*). The paper's
    actual rule is "below ~60% baseline" and explicitly a conservative estimate; the true
    crossover (30–65% range) is untested. So "above 65% → harmful" was an overstatement and
    is gone from the copy; harm is only confirmed at 90%.
  - **Agentic hero stat strip redesigned** from 4 boxes (incl. the wrong +4.85pp and the
    "~65% flips to harmful") to **8 defensible boxes**: +30.3pp (p=0.002), −4.0pp (p=0.020),
    73.4% gate-revert, 5 model families, 10 phases, 3 benchmarks, 100 problems/condition,
    0 API calls. Hero h1 is now "Multi-Agent Inference Reliability Framework" (nav label
    stays "Multi-Agent Reliability").
  - **Still open (NOT this repo):** `PROFILE.md` and the resume in the Inference-Lens repo
    still carry "+4.85pp across ten phases" — recommend reconciling those to the endpoints too.
    The `paper/` is frozen; don't edit it.
- **2026-07-19: blueprints built for Multi-Agent Reliability and PredictOps** (same pattern
  as `inference-lens-blueprint.html`): `agentic-llmops-blueprint.html` and
  `predictops-blueprint.html`, each with a system-design map + a code map, plus a preview-card
  section (`#blueprints`) added to `agentic-llmops.html` and `predictops.html` linking to them.
  All four blueprints now share the one self-contained engine (theme-aware, magnifier, flow
  chips with hover-spotlight). Specs were built from a fresh read of each repo (research agents),
  not guessed. **Numbers chosen for defensibility (flag if editing):**
  - Multi-Agent Reliability uses the **CI-confirmed** endpoints from `phase7_ci_summary.csv`
    (Code Llama 20% → +30.3pp [24.1,36.6]; Qwen 90% → −4.0pp [−6.5,−1.5]; crossover ≈65%). It
    deliberately does NOT show the paper's +4.85pp Phase-3 figure, which `DISCREPANCIES.md`
    says is not reproducible from committed data.
  - PredictOps shows the **repo-true** state: serving is **ONNX + onnxruntime** (sklearn is
    build-time only), and Docker **~1.17 GB → 343 MB (~71%)** — which differs from the frozen
    resume/`predictops.html` figure of 1.66 GB → 733 MB / 56%. If the site page and blueprint
    should agree, reconcile `predictops.html` to the ONNX numbers (or vice-versa) deliberately.
  - Generation method: each blueprint is `cp inference-lens-blueprint.html` then a Python
    splice of the two `sys`/`code` spec objects (between the `var SP=280` and `function boot(){`
    markers) + asserted copy replacements. No shared-asset edits, so no `?v=` bump this round.
- **2026-07-19: redirect-loop glitch fixed + "Agentic LLMOps" renamed to "Multi-Agent
  Reliability."**
  - **The glitch:** each project had a same-named directory (`about/`, `agentic-llmops/`,
    `inference-lens/`, `predictops/`, `play/`, `job-scanner/`) holding a tiny
    `index.html` that did `<meta refresh>` + `location.replace("/<project>")` — a redirect
    back to its own clean URL. Because a same-named `<project>.html` also exists, `/<project>`
    can resolve to the directory stub, which bounced back to `/<project>` = an infinite
    "Redirecting to /agentic-llmops" loop (reproduces under a local `http.server`; likely on
    Pages too when the dir wins over the file). **Fix applied:** the stubs now redirect to
    `/<project>.html` (a terminal real file), so the loop can't happen. **Recommended clean-up
    (not done — `rm` was blocked by the sandbox): delete the six redirect-stub directories
    entirely** (`rm -rf about agentic-llmops inference-lens predictops play job-scanner` from
    the repo root). Pages serves `<project>.html` at `/<project>` natively (per the convention
    below), so those dirs are pure redundancy once removed.
  - **Rename:** every display occurrence of "Agentic LLMOps" is now "Multi-Agent Reliability"
    (nav, hero h1, `<title>`, project card, footer, about page, blueprint nav — 21 spots). The
    URL, file name (`agentic-llmops.html`), and GitHub repo name stay `agentic-llmops`; only the
    human-facing label changed.
- **2026-07-19: site-wide light/dark theme added.** The site was dark-only; it now has a
  light theme and a toggle in the nav on every page. How it works:
  - **Tokens do the work.** `style.css` gained a `:root[data-theme="light"]` block that
    redefines the color tokens, plus a handful of overrides for spots that hardcoded dark
    values (`.nav` bg, the `body::after` grid lines, `.btn-ghost`, table hover, the `.il-*`
    demo scorecards, `.fedge.branch`, `.pkt.muted`). Because nearly everything (including
    the `flow.js` diagram classes `.fnode`/`.fedge`/etc.) already used `var(--...)`, the
    pipeline diagrams, tables, cards, and prose all flip for free.
  - **Charts** use theme-neutral colors now (`applyChartTheme` + inline grid colors set to
    `#8b93a7` / `rgba(130,140,160,0.16)`) so they stay legible in both themes without a
    redraw on toggle. Chart.js is render-once, so this avoids a re-init dance.
  - **Toggle** is an organic sliding pill (sun/moon inside the knob) — class `.theme-switch`
    / `.ts-track` / `.ts-knob`. NOTE: the request referenced "job-scanner's light/dark
    button," but no such toggle existed anywhere in the repo (job-scanner only had the
    hamburger `.nav-toggle`); this is a fresh design. Confirm the exact look with Kalyan.
  - **Persistence & flash:** choice saved to `localStorage['kv-theme']`; each page's `<head>`
    sets `data-theme` before paint. Default is dark. Wiring lives in `script.js`.
  - **Asset version bumped `?v=2` -> `?v=3`** for `style.css` and `script.js` on all 7
    pages (the cache rule below). `flow.js` was not edited, left at `?v=2`.
  - **The blueprint page** (`inference-lens-blueprint.html`, self-contained) shares the
    same `kv-theme` key and the same organic toggle. **2026-07-19 update: its two diagrams
    now flip with the theme too** (previously pinned dark). The engine no longer bakes node
    colors inline; the rect gets `class="nk nk-<kind>"` and the CSS defines dark defaults +
    `:root[data-theme="light"]` overrides per kind (CSS beats the inline presentation
    fills). Edges use `.e-grey/.e-indigo/.e-amber/.e-green/.e-pink` classes, bands use
    `.band-box`, and emphasis text uses `.em-good/.em-warn/.em-bad` (all theme-aware). The
    frame/bar/wrap/legend/lens backgrounds now use tokens, and `header.top` has a light
    override. Also new: the plain arrow breadcrumb in each diagram bar is now a row of
    `.fstep` chips (one per stage, colored dot); hovering a chip adds `.hl` to the matching
    node (`[data-id]`) to spotlight which region is "features", "clustering", etc. The
    preview thumbnails on `inference-lens.html` (`.bp-thumb`) also got light overrides.
  - **Verified in-browser in light mode on every page**: home (chrome, stats, scatter
    chart), inference-lens (demo, blueprint cards), agentic-llmops (animated pipeline,
    bar chart, tables), predictops (status table, callouts), job-scanner (flow diagram,
    legend), about (timeline), play (scorer), and the blueprint. Dark unchanged (default).
  - **Not committed** (ask-before-committing rule).
- **2026-07-19: `inference-lens-blueprint.html` added, a new deep-dive "blueprint" page
  for Inference-Lens, plus a preview entry point on `inference-lens.html`.** This is the
  first instance of a planned pattern: every project gets two zoomable, animated diagrams,
  a **system-design map** (stages in run order: resources in, pipeline spine, artifacts
  out) and a **code map** (every file with its one-line job, arranged around the data
  lineage spine). Kalyan will replicate this for the other projects next.
  - **The page is deliberately self-contained** (its own inline CSS/JS, design tokens
    mirrored from `style.css`), not wired to the shared `assets/`. It does NOT reuse
    `flow.js`; it has its own tiny SVG engine that renders nodes/edges from a JS spec,
    animates packets along the edges, and drives a **rectangular hover magnifier** (a
    2.4x lens that clones the SVG so it stays vector-crisp). Reason for self-containment:
    it previews anywhere and drops in without touching shared assets. If you later fold it
    onto shared assets, the magnifier is the piece `flow.js` does not have.
  - **Packet colour story on these blueprints:** indigo = HH-RLHF training data in flight,
    amber = held-out LLM-Bar adversarial path, green = trained/served output.
  - **It has its own light/dark toggle** (sun/moon in the header, persists to
    `localStorage['il-theme']`, default dark). The page chrome flips, but the **diagram
    frames stay dark in both themes** on purpose: `.dgm-frame` locally pins the dark token
    values so the blueprint canvas reads like an editor panel even in light mode.
  - **Numbers were reconciled against the Inference-Lens repo** (`reports/*.csv`, source,
    and its `CLAUDE.md`) before being drawn: 91,264 HH-RLHF pairs / ~182K labeled
    responses, all three models ~0.50 clean AUC, LogReg 78.4% neighbor FPR / 34.8% overall
    acc, XGBoost ~flat, the 4 archetypes (48.9-51.6% chosen), 419 LLM-Bar pairs.
  - **Entry point on `inference-lens.html`:** a new `#blueprints` section ("See exactly how
    it is built") with two preview cards (scoped `.bp-*` classes, no `style.css` edit, so
    no cache-bump was needed) linking to `/inference-lens-blueprint#system` and `#code`.
    Chosen a dedicated page over a modal because the content needs full width + the
    magnifier. Copy on the new page was run through the em-dash/humanize rule.
  - **2026-07-19 follow-up:** the `#blueprints` section was moved up to sit **directly
    under the `#demo` live-demo section** (was near the bottom before Takeaways). Also, the
    preview-card links and the blueprint page's own nav were switched from extensionless to
    explicit **`.html`** links (`inference-lens-blueprint.html#system`, `inference-lens.html`,
    etc.). This is a deliberate deviation from the site's extensionless convention: the
    extensionless paths 404 under a plain local `python3 -m http.server`, and `.html`
    resolves both locally and on Pages. If you want strict convention consistency later,
    switch these back to extensionless (they only work on Pages then).
  - **Not committed** (consistent with the "ask before committing" rule).
- **2026-07-16: `job-scanner.html` added, the 4th project, plus an animated-diagram
  engine.** Kalyan's private job-search automation repo, written up without exposing
  it. Homepage grid is now 4 cards (2x2; `.proj-grid` is `1fr 1fr`, no CSS change
  needed) and the thesis paragraph was extended to cover a fourth project. **The repo
  stays private and there is deliberately no GitHub link.** Numbers were verified
  against the real repo rather than trusted from its CLAUDE.md: **630 companies**
  across **8 live ATS platforms** (10 adapters written; 2 sit at 0 companies), 5 model
  stages. **"799 resumes tailored" was deliberately NOT used as a stat** — Kalyan's
  call: it reads as "applied to 800 jobs and still unemployed". The 594-job staleness
  numbers are framed as "first full run" because `gone_jobs.json` is currently empty.
  - **Positioning was rewritten once and matters.** The first draft opened with "I got
    tired of my job search", which reads as low demand. It now opens from "I am a
    research engineer who works on agents, so when I looked at my own job search I saw
    an agent problem with a live dataset attached." Don't reintroduce the chore
    framing, and don't say he built it "before I knew the term" — that contradicts the
    positioning.
  - **`assets/flow.js` (new)** is a generic animated-pipeline engine: reads a JSON spec
    from `<svg data-flow='{...}'>`, spawns SVG circles that traverse concatenated
    `<path>` elements by id via `getPointAtLength`, and recolours them mid-route via
    `splits` (deterministic `cls`, or weighted `pick`). Honours `prefers-reduced-motion`
    (diagram renders, no packets) and pauses via IntersectionObserver when off screen.
  - **`agentic-llmops.html`'s diagram was replaced.** The old flat left-to-right node
    row was confusing **because it hid the conditional branch**. The new SVG shows the
    bypass, and the dots teach the routing: indigo leaves the Planner, green takes the
    sub-threshold bypass, amber routes to the Fixer, and the gate output is a real
    weighted split (**0.734 muted / 0.266 ok**) matching the measured reversion rate.
- **⚠️ CSS COLLISION — read before touching flow.js class names.** `predictops.html`
  **still uses the old `.pipeline` / `.flow` markup**, so those rules must stay in
  `style.css`. The packet class was originally `.pkt.flow`, which inherited
  `.flow { min-width: 640px; display:flex }` and stretched the legend swatch into a
  640px bar. It is now **`.pkt.live` / `.k.live`**. Don't name anything `flow` again.
- **The black-boxes bug, and its two fixes.** After the first push Kalyan saw black
  placeholder boxes live. Root cause was **not** a deploy failure: **fresh HTML + a
  stale cached `style.css`** (`cache-control: max-age=600`). An SVG `<rect>` with no
  `fill` **defaults to black**, so without the new `.fnode rect` rule every node
  rendered black with black invisible text. Reproduced by deleting the rules on the
  live page. Fixes: (1) **cache-bust** — all pages now load `assets/style.css?v=2`,
  `script.js?v=2`, `flow.js?v=2`; **bump `?v=N` on every future CSS/JS edit**.
  (2) **SVG presentation-attribute fallbacks** — every `<rect>`/`<text>`/`<path>` in
  both diagrams carries a real `fill`/`stroke` attribute. CSS overrides presentation
  attributes so nothing changed visually, but the diagram now renders correctly with
  **zero CSS** (verified by deleting all 19 diagram rules and re-checking computed
  styles). Keep them if you edit the SVGs.
- **Platform-name redaction on `job-scanner.html` is real, not cosmetic.** The 8 ATS
  names are **not in the DOM at all** — the table ships `Platform 01`..`08`, and
  `.redact` only adds `blur(5px)` + `user-select:none` on top. CSS blur alone would be
  fake security (view-source defeats it). Counts and fetch shapes stay readable so
  recruiters still see the scale. A note on the page promises to open source it once
  he's settled. Same reason the Rippling pagination quirk is told without naming it.
- **Three content rules Kalyan enforced sitewide (2026-07-16), not just on the new
  page:** **numerals not number-words** ("10 minutes", not "ten"); **no comma before
  "and"** (46 removed; now 0 across all 7 pages); **no model-vendor names** on
  `job-scanner.html` (Haiku/Sonnet/Claude gone, replaced with "cheap model"/"strong
  model") so readers can't infer the provider. The mechanical comma rule created **2
  real misparses** (e.g. "Code Llama gained 32 points, the largest in the study and the
  inverse relationship... came into view") — both fixed by splitting the sentence, not
  by restoring the comma. Watch for that class if the rule is ever reapplied.
- **Feature boxes on `job-scanner.html` have no `.ico` emoji divs**, deliberately.
  Kalyan cut them and called out AI-slop headings; "Model routing by task, not by
  habit" became "2 models, split by what the work needs".
- **Nothing from the 2026-07-16 session was committed.** `git status` was left dirty on
  purpose: this is a public site and the job-scanner page has a strategic dimension (it
  advertises that he automates job applications) he wanted to review before pushing.
  **Ask before committing here.**

- **2026-07-15: PredictOps went from 3/7 to 7/7 build phases.** All of Phase 4-7
  actually shipped in the PredictOps repo (CI eval gate at ROC-AUC >= 0.80, MLflow
  registry Staging->Production promotion, Evidently-with-PSI drift detection at a
  0.15 per-feature threshold, and a Makefile wiring the full loop). `predictops.html`
  and `index.html`'s project card were updated to match: 3/7 -> 7/7, the phase table
  all "done," the hero eyebrow/lead copy no longer says "build in progress" or "next."
  Two new finding boxes added (Phase 5-6 registry+PSI, and a Phase 3 revisit). While
  verifying resume claims against the actual repo the same session, the Docker
  multi-stage build turned out not to actually slim the runtime image (it copied the
  entire builder environment including MLflow/Evidently/pytest/ruff) — fixed by
  splitting `predictops/config.py` out of `train.py` and giving the final Docker
  stage its own `requirements-serve.txt`. Real measured result: 1.66GB -> 733MB (56%),
  not the earlier claimed ~1.2GB -> ~340MB (72%) which was never actually measured.
  This site's copy, and the 4 resume `.tex` files in `job-scanner/base-resume-latex-
  files/`, now both use the real number. The repo had reverted to private since the
  last session's public flip; Kalyan flipped it public again himself later in this
  same session, so the "View on GitHub" link now resolves for real visitors.
  **Still open, carrying into next session:** the CI badge on `predictops.html`
  is red, but not because of the code — Kalyan's GitHub account has a billing
  problem ("recent account payments have failed or spending limit needs
  increasing") that stops the Actions job before it even starts. Nothing to fix on
  this site's end; the badge will self-resolve once billing is fixed and a new push
  runs. Don't "fix" it by hiding or reframing the badge — it's telling the truth
  about current state.
- **Second pass, same day (2026-07-13):** fixed the Graduate Research Engineer
  timeline entry on `about.html` (was "Sep 2025 to present," now "Sep 2025 to
  Jun 2026" since Kalyan graduates then and the role can't outlive his MS).
  Added a "Software engineering" skill category to `about.html`'s toolkit
  (Java, Spring Boot, REST APIs, PostgreSQL, Flyway, JUnit, Data structures,
  Git) and the same Java/Spring Boot tags to `index.html`'s toolkit, so the
  site doesn't read as ML-only when he's also targeting SWE roles. This is
  deliberately just skill tags, not a Vaultex writeup (that's still excluded,
  see above) — the reasoning was to show real breadth without overclaiming a
  project that doesn't exist on this site. Every em dash (`&mdash;`) that had
  crept into `predictops.html`'s and `agentic-llmops.html`'s prose during the
  first pass was cut and rewritten as separate sentences or commas, per
  Kalyan's explicit "remove all em dashes, humanize the content" instruction
  (checked against the `humanizer` skill's Wikipedia-based AI-writing-pattern
  guide, installed mid-session at `~/.claude/skills/humanizer/SKILL.md` since
  it isn't picked up as an invocable skill until a fresh session starts).
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

- **Internal links are extensionless.** As of 2026-07-16, nav/footer/inline
  links, `canonical`, and `og:url` all use `/about` style paths, not
  `about.html`. GitHub Pages resolves these natively (no Jekyll config,
  `.nojekyll`, or redirect needed) — confirmed this works without a build
  step. Homepage links to `/` rather than `index.html`. Local testing with
  a plain static server (e.g. `python3 -m http.server`) will 404 on the
  extensionless paths since that resolution is GitHub Pages-specific; only
  production (or a Pages-accurate server) will show it working. When adding
  a new page, follow this pattern for its links rather than reintroducing
  `.html`.
- **Don't let commits attribute to Claude.** Kalyan doesn't want `claude`
  showing up in this repo's GitHub contributors graph since recruiters view
  it. Check for an `attribution` block (empty `commit`/`pr` strings) in
  `.claude/settings.local.json` or the user's global `~/.claude/settings.json`
  before committing here.
- **Bump the asset version on any CSS/JS edit.** Pages load `assets/style.css?v=2` etc. HTML and CSS are separately cached, and a fresh page against a stale stylesheet is what produced the black-boxes bug above. If you edit `style.css`, `script.js` or `flow.js`, bump `?v=N` on every page in the same commit.
- **Keep this file current.** This file, not Cowork's memory system, is meant
  to be the one artifact both Claude Code and Cowork converge on for this
  repo. Update it at the end of any nontrivial session, regardless of which
  Claude surface you're using.
