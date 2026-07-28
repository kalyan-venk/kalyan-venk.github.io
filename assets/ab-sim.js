/* ===========================================================================
   GroundTruth A/B test simulator. All math runs in the browser, no backend.

   The formulas are the ones the repo actually uses:
     - power: two-proportion z-test via Cohen's h (src/power.py)
     - CUPED: variance falls by (1 - rho^2), so the SE falls by sqrt(1-rho^2)
       and the CI shrinks with it (src/analyze.py)
     - sequential: the always-valid normal-mixture boundary from Howard et al.
       (2021), the same one in src/sequential.py, replaces z_{alpha/2} with a
       wider multiplier so the interval holds at every sample size at once.

   Nothing here reads a Criteo row. Like the pipeline, it works off summary
   statistics: the two conversion rates, the per-arm n, and rho.
   =========================================================================== */
(function () {
  "use strict";

  var ALPHA = 0.05;
  var ZA = 1.959963985; // z_{0.025}, two-sided 95%

  // --- normal CDF via Abramowitz & Stegun 7.1.26 ---
  function erf(x) {
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function Phi(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

  function compute(baseline, mdeRel, n, rho) {
    var p1 = baseline;
    var p2 = Math.min(0.999999, p1 * (1 + mdeRel));
    var effect = p2 - p1; // absolute lift, in proportion units

    // power: Cohen's h, then the noncentrality for equal arms of size n
    var h = 2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1));
    var delta = h * Math.sqrt(n / 2);
    var power = Phi(delta - ZA) + Phi(-delta - ZA);

    // naive two-proportion SE (unpooled / Welch, as the pipeline uses)
    var seNaive = Math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n);
    // CUPED: variance x (1 - rho^2)  ->  SE x sqrt(1 - rho^2)
    var seCuped = seNaive * Math.sqrt(1 - rho * rho);

    var varCutPct = rho * rho;                       // fraction of variance removed
    var ciCutPct = 1 - Math.sqrt(1 - rho * rho);     // fraction off the interval width

    // always-valid boundary (Howard mixture), matching src/sequential.py
    var nEff = 1 / (1 / n + 1 / n);                  // = n/2 for equal arms
    var rhoTune = nEff;                              // tightest near the landed n
    var boundary = Math.sqrt((nEff * rhoTune + 1) / (nEff * rhoTune)
      * Math.log((nEff * rhoTune + 1) / (ALPHA * ALPHA)));
    var widthPenalty = boundary / ZA;

    return {
      p1: p1, p2: p2, effect: effect, n: n, rho: rho,
      power: Math.max(0, Math.min(1, power)),
      seNaive: seNaive, seCuped: seCuped,
      varCutPct: varCutPct, ciCutPct: ciCutPct,
      naiveLo: effect - ZA * seNaive, naiveHi: effect + ZA * seNaive,
      cupedLo: effect - ZA * seCuped, cupedHi: effect + ZA * seCuped,
      avBoundary: boundary, widthPenalty: widthPenalty,
      avLo: effect - boundary * seNaive, avHi: effect + boundary * seNaive,
      fixedSig: effect - ZA * seNaive > 0,
      avSig: effect - boundary * seNaive > 0
    };
  }

  // pp = percentage points, effects are small so print with enough digits
  function pp(x) { return (x * 100).toFixed(4) + " pp"; }
  function pct1(x) { return (x * 100).toFixed(1) + "%"; }
  function relLift(r) { return "+" + ((r.p2 / r.p1 - 1) * 100).toFixed(1) + "%"; }

  // draw one horizontal CI bar into a track that maps [xmin,xmax] -> 0..100%
  function bar(lo, hi, mid, xmin, xmax, cls) {
    function pos(v) { return ((v - xmin) / (xmax - xmin)) * 100; }
    var left = pos(lo), right = pos(hi), c = pos(mid), zero = pos(0);
    return '<div class="gt-bar">'
      + '<div class="gt-zero" style="left:' + zero.toFixed(2) + '%"></div>'
      + '<div class="gt-span ' + cls + '" style="left:' + left.toFixed(2) + '%;width:' + (right - left).toFixed(2) + '%"></div>'
      + '<div class="gt-dot ' + cls + '" style="left:' + c.toFixed(2) + '%"></div>'
      + '</div>';
  }

  function render(r) {
    // power meter
    var pw = document.getElementById("gt-power");
    pw.textContent = pct1(r.power);
    pw.className = "gt-big " + (r.power >= 0.8 ? "ok" : r.power >= 0.5 ? "warn" : "bad");
    document.getElementById("gt-power-fill").style.width = (r.power * 100).toFixed(1) + "%";
    document.getElementById("gt-power-note").textContent =
      r.power >= 0.8 ? "powered: at least 80% chance of catching a true effect this size"
        : "underpowered: a true effect this size would often be missed";

    // CI bars, shared axis across both intervals
    var xmax = Math.max(r.naiveHi, r.effect) * 1.15;
    var xmin = Math.min(0, r.naiveLo) * 1.15;
    if (xmax <= xmin) xmax = xmin + 1e-9;
    document.getElementById("gt-ci-naive").innerHTML = bar(r.naiveLo, r.naiveHi, r.effect, xmin, xmax, "naive");
    document.getElementById("gt-ci-cuped").innerHTML = bar(r.cupedLo, r.cupedHi, r.effect, xmin, xmax, "cuped");
    document.getElementById("gt-ci-naive-txt").textContent = "[" + pp(r.naiveLo) + ", " + pp(r.naiveHi) + "]";
    document.getElementById("gt-ci-cuped-txt").textContent = "[" + pp(r.cupedLo) + ", " + pp(r.cupedHi) + "]";
    document.getElementById("gt-effect").textContent = pp(r.effect) + "  (" + relLift(r) + " relative)";
    document.getElementById("gt-varcut").textContent = pct1(r.varCutPct);
    document.getElementById("gt-cicut").textContent = pct1(r.ciCutPct);

    // sequential decision
    var seq = document.getElementById("gt-seq");
    var verdict, cls;
    if (r.avSig) { verdict = "Stop. Significant even under continuous monitoring."; cls = "ok"; }
    else if (r.fixedSig) { verdict = "Fixed-horizon significant, but not yet under always-valid monitoring. Keep going."; cls = "warn"; }
    else { verdict = "Not significant. Keep going, do not call it."; cls = "bad"; }
    seq.textContent = verdict;
    seq.className = "gt-verdict " + cls;
    document.getElementById("gt-penalty").textContent = r.widthPenalty.toFixed(2) + "x";
    document.getElementById("gt-av-txt").textContent =
      "always-valid 95% CI  [" + pp(r.avLo) + ", " + pp(r.avHi) + "]  ("
      + r.avBoundary.toFixed(2) + " SE vs 1.96)";
  }

  function read(id) { return parseFloat(document.getElementById(id).value); }

  function sync() {
    var baseline = read("gt-baseline") / 100;   // % -> proportion
    var mde = read("gt-mde") / 100;             // relative %
    var n = read("gt-n");
    var rho = read("gt-rho");

    document.getElementById("gt-baseline-v").textContent = read("gt-baseline").toFixed(1) + "%";
    document.getElementById("gt-mde-v").textContent = read("gt-mde").toFixed(0) + "%";
    document.getElementById("gt-n-v").textContent = Math.round(n).toLocaleString();
    document.getElementById("gt-rho-v").textContent = rho.toFixed(2);

    render(compute(baseline, mde, n, rho));
  }

  function init() {
    var ids = ["gt-baseline", "gt-mde", "gt-n", "gt-rho"];
    for (var i = 0; i < ids.length; i++) {
      var elm = document.getElementById(ids[i]);
      if (!elm) return; // not on this page
      elm.addEventListener("input", sync);
    }
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
