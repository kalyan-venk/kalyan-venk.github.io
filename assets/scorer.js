// Inference-Lens client-side scorer.
// The trained Logistic Regression, ported to run in the browser. See the note on
// scoreAll() for why XGBoost is not exposed here.
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

  // ROUGE-L is scored against the instruction, exactly as in training.
  // Scoring it between the two candidate responses would be wrong twice over:
  // the models never saw that distribution, and the F-measure is symmetric, so
  // both responses would receive an identical value.
  function features(text, prompt) {
    return [tokenLength(text), typeTokenRatio(text), flesch(text), rougeL(text, prompt)];
  }

  const sigmoid = (z) => 1 / (1 + Math.exp(-z));

  function scoreLogReg(x) {
    let z = M.li;
    for (let j = 0; j < 4; j++) z += M.lc[j] * ((x[j] - M.sm[j]) / M.ss[j]);
    return sigmoid(z);
  }

  function scoreXGB(x) {
    let s = M.b;
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

  // Logistic Regression only. XGBoost is deliberately not exposed here.
  // The browser cannot reproduce textstat's syllable counting or rouge_score's
  // Porter stemmer, so two of the four features are approximations. Logistic
  // Regression is a smooth weighted sum and absorbs that: it reproduces the
  // trained model's choice on 396 of 419 LLM-Bar pairs (94.5%). XGBoost splits
  // on hard thresholds, so the same small feature error sends inputs down
  // different branches and agreement collapses to 53.9%, no better than chance.
  // Shipping that would mean labelling a coin flip "XGBoost".
  function scoreAll(text, prompt) {
    const x = features(text, prompt);
    return { "Logistic Regression": scoreLogReg(x) };
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
      return `<b>Dead heat.</b> The model split the difference, and that tells you something. When two answers land this close, an automated judge is at its least trustworthy.`;
    }
    const winner = votesA > votesB ? "A" : "B";
    const loser = winner === "A" ? "B" : "A";
    const winLen = winner === "A" ? lenA : lenB;
    const loseLen = winner === "A" ? lenB : lenA;
    if (winLen > loseLen) {
      return `<b>The model backed Response ${winner}.</b> Response ${winner} is the longer answer and the leaner Response ${loser} just lost. Length is the strongest single feature this model has, and on helpful prompts it points this way. Ask something you should not be helped with and the same lean becomes a liability, because there the good answer is the short refusal.`;
    }
    return `<b>The model backed Response ${winner}.</b> This round it picked the shorter answer. Want to watch it slip? Pad Response ${loser} out with filler and score again. Length carries more weight here than anything else in the feature set.`;
  }

  function featureRow(label, a, b, note) {
    return `<tr><td>${label}</td><td>${a}</td><td>${b}</td><td class="il-note">${note}</td></tr>`;
  }

  function render(prompt, a, b) {
    const sa = scoreAll(a, prompt), sb = scoreAll(b, prompt);
    const names = Object.keys(sa);
    let votesA = 0, votesB = 0;
    names.forEach((n) => (sa[n] > sb[n] ? votesA++ : votesB++));
    const lenA = tokenLength(a), lenB = tokenLength(b);

    const cards = names.map((n) => scorecard(n, sa[n], sb[n])).join("");
    const fa = features(a, prompt), fb = features(b, prompt);
    const ft = [
      featureRow("Length (words)", fa[0], fb[0], "the strongest single feature, and it points opposite ways on helpful vs harmless prompts"),
      featureRow("Vocabulary variety", fa[1].toFixed(2), fb[1].toFixed(2), "share of unique words"),
      featureRow("Readability", fa[2].toFixed(0), fb[2].toFixed(0), "higher is easier to read"),
      featureRow("Overlap with the prompt", fa[3].toFixed(2), fb[3].toFixed(2), "how much it echoes what was asked"),
    ].join("");

    document.getElementById("il-results").innerHTML = `
      <div class="il-verdict">${verdictText(votesA, votesB, lenA, lenB)}</div>
      <div class="il-cards">${cards}</div>
      <div class="il-features">
        <div class="il-feat-title">What the model is actually looking at</div>
        <table class="il-feat-table">
          <thead><tr><th>Signal</th><th>A</th><th>B</th><th>In plain English</th></tr></thead>
          <tbody>${ft}</tbody>
        </table>
      </div>`;
    document.getElementById("il-results").classList.add("show");
  }

  // ---- wiring ----
  const SAMPLE_Q = "What is the difference between supervised and unsupervised learning?";
  const SAMPLE_A = "Supervised learning uses labeled data. You give the model examples where you already know the right answer, and it learns to map inputs to outputs. Unsupervised learning has no labels. The model finds structure on its own.";
  const SAMPLE_B = "Supervised learning and unsupervised learning are both machine learning paradigms that have been extensively studied in the literature and both involve the use of algorithms and computational methods to perform learning tasks on data, though they differ in terms of whether labeled training data is utilized or not during the model training process, which is an important distinction worth understanding in depth.";

  document.addEventListener("DOMContentLoaded", () => {
    const a = document.getElementById("il-a");
    const b = document.getElementById("il-b");
    const sample = document.getElementById("il-sample");
    const score = document.getElementById("il-score");
    if (!a || !score) return;

    const q = document.getElementById("il-q");
    sample.addEventListener("click", () => {
      if (q) q.value = SAMPLE_Q;
      a.value = SAMPLE_A; b.value = SAMPLE_B;
    });
    score.addEventListener("click", () => {
      if (!a.value.trim() || !b.value.trim()) {
        document.getElementById("il-results").innerHTML =
          `<div class="il-verdict">Both boxes need text. Or just hit Load a sample pair and skip the typing.</div>`;
        document.getElementById("il-results").classList.add("show");
        return;
      }
      render(q && q.value.trim() ? q.value : "", a.value, b.value);
    });
  });
})();
