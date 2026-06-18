// Inference-Lens client-side scorer.
// The real Logistic Regression and XGBoost models, ported to run in the browser.
// Model parameters and trees live in window.IL_MODEL (assets/model.js).

(function () {
  const M = window.IL_MODEL;

  // ---- features (mirror of the trained pipeline) ----
  const tokens = (t) => t.trim().split(/\s+/).filter(Boolean);

  function tokenLength(t) { return tokens(t).length; }

  function typeTokenRatio(t) {
    const tk = tokens(t);
    if (!tk.length) return 0;
    return new Set(tk).size / tk.length;
  }

  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    const g = w.match(/[aeiouy]+/g);
    let c = g ? g.length : 0;
    if (w.endsWith("e")) c -= 1;
    return Math.max(1, c);
  }

  function flesch(t) {
    const words = t.match(/[A-Za-z0-9']+/g) || [];
    const sents = t.split(/[.!?]+/).filter((s) => s.trim().length);
    const nw = words.length;
    if (!nw) return 0;
    const ns = Math.max(1, sents.length);
    const syl = words.reduce((a, w) => a + syllables(w), 0);
    return 206.835 - 1.015 * (nw / ns) - 84.6 * (syl / nw);
  }

  function rougeL(pred, ref) {
    const p = pred.toLowerCase().split(/\s+/).filter(Boolean);
    const r = ref.toLowerCase().split(/\s+/).filter(Boolean);
    if (!p.length || !r.length) return 0;
    const dp = new Array(r.length + 1).fill(0);
    for (let i = 1; i <= p.length; i++) {
      let prev = 0;
      for (let j = 1; j <= r.length; j++) {
        const tmp = dp[j];
        dp[j] = p[i - 1] === r[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
        prev = tmp;
      }
    }
    const lcs = dp[r.length];
    const P = lcs / p.length, R = lcs / r.length;
    return P + R === 0 ? 0 : (2 * P * R) / (P + R);
  }

  function features(text, ref) {
    return [tokenLength(text), typeTokenRatio(text), flesch(text), rougeL(text, ref)];
  }

  const sigmoid = (z) => 1 / (1 + Math.exp(-z));

  function scoreLogReg(x) {
    let z = M.li;
    for (let j = 0; j < 4; j++) z += M.lc[j] * ((x[j] - M.sm[j]) / M.ss[j]);
    return sigmoid(z);
  }

  function scoreXGB(x) {
    let s = 0;
    for (const tree of M.t) {
      let i = 0;
      while (tree[i].length > 1) {
        const node = tree[i];
        i = x[node[0]] < node[1] ? node[2] : node[3];
      }
      s += tree[i][0];
    }
    return sigmoid(s);
  }

  function scoreAll(text, ref) {
    const x = features(text, ref);
    return { "Logistic Regression": scoreLogReg(x), "XGBoost": scoreXGB(x) };
  }

  // ---- rendering ----
  function bar(value, win) {
    const w = Math.max(value * 100, 3).toFixed(0);
    return `<div class="il-bar"><div class="il-fill${win ? " win" : ""}" style="width:${w}%"></div></div>`;
  }

  function scorecard(name, pa, pb) {
    const aWin = pa >= pb;
    return `
      <div class="il-scorecard">
        <div class="il-sc-head"><span class="il-sc-name">${name}</span>
          <span class="il-sc-pick">backs ${aWin ? "A" : "B"}</span></div>
        <div class="il-sc-row"><span class="il-sc-lbl">A</span>${bar(pa, aWin)}<span class="il-sc-num">${pa.toFixed(3)}</span></div>
        <div class="il-sc-row"><span class="il-sc-lbl">B</span>${bar(pb, !aWin)}<span class="il-sc-num">${pb.toFixed(3)}</span></div>
      </div>`;
  }

  function verdictText(votesA, votesB, lenA, lenB) {
    if (votesA === votesB) {
      return `<b>Dead heat.</b> The models could not agree, and honestly that tells you something. When two answers land this close, automated judges are at their least trustworthy.`;
    }
    const winner = votesA > votesB ? "A" : "B";
    const loser = winner === "A" ? "B" : "A";
    const winLen = winner === "A" ? lenA : lenB;
    const loseLen = winner === "A" ? lenB : lenA;
    if (winLen > loseLen) {
      return `<b>Both models backed Response ${winner}.</b> Here is the catch. Response ${winner} is the longer answer, and the leaner Response ${loser} just lost. This is the exact failure the project is about. The models reward length and polish, not substance, and a person might well have picked the other way.`;
    }
    return `<b>Both models backed Response ${winner}.</b> This round they picked the shorter, cleaner answer. Want to watch them slip? Pad Response ${loser} out with filler and score again. They flip more often than you would like.`;
  }

  function featureRow(label, a, b, note) {
    return `<tr><td>${label}</td><td>${a}</td><td>${b}</td><td class="il-note">${note}</td></tr>`;
  }

  function render(a, b) {
    const sa = scoreAll(a, b), sb = scoreAll(b, a);
    const names = Object.keys(sa);
    let votesA = 0, votesB = 0;
    names.forEach((n) => (sa[n] > sb[n] ? votesA++ : votesB++));
    const lenA = tokenLength(a), lenB = tokenLength(b);

    const cards = names.map((n) => scorecard(n, sa[n], sb[n])).join("");
    const fa = features(a, b), fb = features(b, a);
    const ft = [
      featureRow("Length (words)", fa[0], fb[0], "longer is not better, but the models lean that way"),
      featureRow("Vocabulary variety", fa[1].toFixed(2), fb[1].toFixed(2), "share of unique words"),
      featureRow("Readability", fa[2].toFixed(0), fb[2].toFixed(0), "higher is easier to read"),
      featureRow("Overlap with the other", fa[3].toFixed(2), fb[3].toFixed(2), "how much it echoes the other answer"),
    ].join("");

    document.getElementById("il-results").innerHTML = `
      <div class="il-verdict">${verdictText(votesA, votesB, lenA, lenB)}</div>
      <div class="il-cards">${cards}</div>
      <div class="il-features">
        <div class="il-feat-title">What the models are actually looking at</div>
        <table class="il-feat-table">
          <thead><tr><th>Signal</th><th>A</th><th>B</th><th>In plain English</th></tr></thead>
          <tbody>${ft}</tbody>
        </table>
      </div>`;
    document.getElementById("il-results").classList.add("show");
  }

  // ---- wiring ----
  const SAMPLE_A = "Supervised learning uses labeled data. You give the model examples where you already know the right answer, and it learns to map inputs to outputs. Unsupervised learning has no labels. The model finds structure on its own.";
  const SAMPLE_B = "Supervised learning and unsupervised learning are both machine learning paradigms that have been extensively studied in the literature and both involve the use of algorithms and computational methods to perform learning tasks on data, though they differ in terms of whether labeled training data is utilized or not during the model training process, which is an important distinction worth understanding in depth.";

  document.addEventListener("DOMContentLoaded", () => {
    const a = document.getElementById("il-a");
    const b = document.getElementById("il-b");
    const sample = document.getElementById("il-sample");
    const score = document.getElementById("il-score");
    if (!a || !score) return;

    sample.addEventListener("click", () => { a.value = SAMPLE_A; b.value = SAMPLE_B; });
    score.addEventListener("click", () => {
      if (!a.value.trim() || !b.value.trim()) {
        document.getElementById("il-results").innerHTML =
          `<div class="il-verdict">Both boxes need text. Or just hit Load a sample pair and skip the typing.</div>`;
        document.getElementById("il-results").classList.add("show");
        return;
      }
      render(a.value, b.value);
    });
  });
})();
