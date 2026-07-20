# MISTAKES.md

Claude's own log of mistakes made in this repo. **Read this before designing or building here.**
Complements `CLAUDE.md` (how the repo works); this file is how Claude has previously gotten it wrong. Append honestly when a new one is caught.

---

## 2026-07-16 — CSS class collision: `.pkt.flow` inherited `.flow { min-width: 640px }`
Added an animated-diagram packet class named `.pkt.flow`. A pre-existing rule `.flow { min-width: 640px; display: flex }` (still used by `predictops.html`'s old pipeline markup) applied to it, stretching the legend swatch into a 640px bar.
- **Root cause:** introduced a new class name without grepping existing CSS for a collision.
- **Guard:** before naming a new CSS class, `grep` the stylesheet for that name. Renamed to `.pkt.live` / `.k.live`.

## 2026-07-16 — Silent no-op on a scripted CLAUDE.md edit
A Python `.replace()` meant to insert a new dated section into `CLAUDE.md` returned the string unchanged (the anchor heading text had changed since it was read), and the write went ahead anyway. The update did not land; only caught it by grepping afterward.
- **Root cause:** assumed a string-replace succeeded instead of asserting it.
- **Guard:** after any scripted find-and-replace, assert the target substring is present (or that the file actually changed) before moving on. Prefer `assert OLD in s`.

## 2026-07-16 — Black boxes on the live site (stale-cache, not a code bug)
After a push, diagram nodes rendered as solid black boxes. First instinct blamed the deploy; the real cause was fresh HTML served with a stale cached `style.css` (`max-age=600`), and an SVG `<rect>` with no `fill` defaults to black.
- **Root cause:** HTML and CSS are separately cached and can desync.
- **Guard:** bump `assets/*.css?v=N` / `*.js?v=N` on every CSS/JS edit, and give SVG shapes real `fill`/`stroke` presentation-attribute fallbacks so they never render black without CSS. (Both now done.)

**Asserted a dataset-design justification without measuring it.** Told Kalyan
the 3 helpful HH-RLHF subsets were "the same axis collected 3 ways," so
scoping to 2 subsets avoided triple-weighting helpfulness. Plausible from the
subset names, and wrong: `helpful-online` averages 110 tokens per response
against `helpful-base`'s 39. The subsets differ substantially in distribution.
The real justification, once measured, is that adding all 4 moves held-out AUC
by 0.003. Lesson: a justification that sounds principled is still a guess until
it is run. This one was offered as interview-ready material, which is worse
than offering it as a hypothesis.

**Called the pooled near-chance result "no signal" for most of a session.**
Reported LogReg/XGBoost at ~0.51 AUC as evidence that surface features carry
no information about human preference, and wrote that into the README and the
portfolio site. The per-subset run shows they reach ~0.57 within a subset and
that `token_length` flips sign between the helpful (+0.220) and harmless
(-0.252) axes. The pooled number was two opposing signals cancelling, not an
absence of signal. Lesson: before concluding a feature set is uninformative,
check whether the training pool mixes populations where the relationship runs
in different directions.
