/* ===========================================================================
   In-browser double-entry ledger for the Vaultex project page.

   No backend. The whole thing is an in-memory account book that posts a
   balanced DEBIT + CREDIT pair per transfer, keeps running balances, and
   refuses any entry pair whose debits do not equal its credits. It mirrors
   invariant #1 from the repo: every transfer writes exactly one DEBIT and one
   CREDIT of equal amount, so the ledger always nets to zero.

   Opening balances are how money enters the system and are deliberately NOT
   ledger rows (same rule as the real service), which is why the ledger sum
   stays at 0.00 even while account balances are non-zero.
   =========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("lgr");
  if (!root) return;

  var SEED = [
    { id: "ada", name: "Ada", currency: "USD", opening: 1000 },
    { id: "grace", name: "Grace", currency: "USD", opening: 0 },
    { id: "vault", name: "Vault", currency: "USD", opening: 500 }
  ];

  var accounts, ledger, tid;

  function reset() {
    accounts = SEED.map(function (a) {
      return { id: a.id, name: a.name, currency: a.currency, opening: a.opening, balance: a.opening };
    });
    ledger = [];
    tid = 0;
  }

  function acct(id) {
    for (var i = 0; i < accounts.length; i++) if (accounts[i].id === id) return accounts[i];
    return null;
  }
  function money(n) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function signed(n) {
    return (n < 0 ? "-" : "+") + money(Math.abs(n));
  }

  // element refs
  var elFrom = document.getElementById("lgrFrom");
  var elTo = document.getElementById("lgrTo");
  var elAmt = document.getElementById("lgrAmt");
  var elMsg = document.getElementById("lgrMsg");
  var elAccts = document.getElementById("lgrAccounts");
  var elRows = document.getElementById("lgrRows");
  var elInv = document.getElementById("lgrInv");
  var elBook = document.getElementById("lgrBook");

  function fillSelects() {
    var opts = accounts.map(function (a) {
      return '<option value="' + a.id + '">' + a.name + " (" + a.currency + ")</option>";
    }).join("");
    elFrom.innerHTML = opts;
    elTo.innerHTML = opts;
    elFrom.value = "ada";
    elTo.value = "grace";
  }

  function message(kind, html) {
    elMsg.className = "lgr-msg show " + kind;
    elMsg.innerHTML = html;
  }

  function renderAccounts() {
    elAccts.innerHTML = accounts.map(function (a) {
      return (
        '<div class="lgr-acct">' +
        '<div class="lgr-acct-name">' + a.name + '</div>' +
        '<div class="lgr-acct-bal">' + money(a.balance) + '</div>' +
        '<div class="lgr-acct-cur">' + a.currency + '</div>' +
        "</div>"
      );
    }).join("");
  }

  function renderLedger() {
    if (!ledger.length) {
      elBook.classList.remove("has-rows");
      elRows.innerHTML = '<tr class="lgr-empty"><td colspan="4">No entries yet. Post a transfer to write the first DEBIT and CREDIT pair.</td></tr>';
    } else {
      elBook.classList.add("has-rows");
      elRows.innerHTML = ledger.map(function (e) {
        return (
          '<tr>' +
          '<td class="lgr-tid">' + e.tref + '</td>' +
          '<td>' + e.account + '</td>' +
          '<td><span class="lgr-dir lgr-' + e.dir.toLowerCase() + '">' + e.dir + '</span></td>' +
          '<td class="lgr-num">' + signed(e.delta) + '</td>' +
          "</tr>"
        );
      }).join("");
    }
    renderInvariant();
  }

  function renderInvariant() {
    var debits = 0, credits = 0, net = 0;
    for (var i = 0; i < ledger.length; i++) {
      var e = ledger[i];
      net += e.delta;
      if (e.dir === "DEBIT") debits += Math.abs(e.delta);
      else credits += e.delta;
    }
    var holds = Math.abs(debits - credits) < 0.005 && Math.abs(net) < 0.005;
    elInv.className = "lgr-invariant " + (holds ? "ok" : "bad");
    elInv.innerHTML =
      '<div class="lgr-inv-row"><span>&Sigma; debits</span><b>' + money(debits) + '</b></div>' +
      '<div class="lgr-inv-eq">' + (holds ? "=" : "&ne;") + '</div>' +
      '<div class="lgr-inv-row"><span>&Sigma; credits</span><b>' + money(credits) + '</b></div>' +
      '<div class="lgr-inv-net">ledger nets to <b>' + money(net) + '</b> ' +
      (holds ? '<span class="lgr-tick">debits == credits</span>' : '<span class="lgr-cross">integrity broken</span>') +
      '</div>';
  }

  /* A normal balanced post: one DEBIT and one CREDIT of equal amount, both
     written in the same step, the way TransferExecutor writes them. */
  function post(fromId, toId, amount) {
    var from = acct(fromId), to = acct(toId);
    if (!from || !to) return message("err", "Unknown account.");
    if (from.id === to.id) return message("err", "A transfer needs two different accounts.");
    if (!(amount > 0)) return message("err", "Amount must be greater than zero.");
    if (from.currency !== to.currency) return message("err", "Currency mismatch. Vaultex has no FX, so both sides must match.");
    if (from.balance + 1e-9 < amount) {
      return message("err", "<b>INSUFFICIENT_FUNDS.</b> " + from.name + " holds " + money(from.balance) +
        ", the transfer asks for " + money(amount) + ". Nothing posts.");
    }

    tid += 1;
    var ref = "T" + String(tid).padStart(3, "0");
    from.balance -= amount;
    to.balance += amount;
    ledger.push({ tref: ref, account: from.name, dir: "DEBIT", delta: -amount });
    ledger.push({ tref: ref, account: to.name, dir: "CREDIT", delta: amount });

    renderAccounts();
    renderLedger();
    message("ok", "<b>201 POSTED " + ref + ".</b> " + money(amount) + " moved " + from.name + " &rarr; " +
      to.name + " as one DEBIT and one CREDIT. Balances updated, ledger still nets to 0.00.");
  }

  /* The rejected case. An unbalanced pair (debit != credit) is refused by the
     ledger-integrity check before anything touches a balance. */
  function postUnbalanced(fromId, toId, debitAmt, creditAmt) {
    var from = acct(fromId), to = acct(toId);
    if (Math.abs(debitAmt - creditAmt) < 0.005) return; // guard, should differ
    message("err",
      "<b>LEDGER_INTEGRITY, transfer refused.</b> The pair tried to write DEBIT " + money(debitAmt) +
      " against CREDIT " + money(creditAmt) + ". Debits must equal credits, so the whole transfer is rejected " +
      "and nothing posts. No balance changed, no row was written.");
    // flash the invariant panel to underline why it was blocked
    elInv.classList.add("flash");
    setTimeout(function () { elInv.classList.remove("flash"); }, 700);
  }

  // wiring
  document.getElementById("lgrPost").addEventListener("click", function () {
    post(elFrom.value, elTo.value, parseFloat(elAmt.value));
  });

  root.querySelectorAll("[data-preset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = btn.getAttribute("data-preset");
      if (p === "ok") {
        elFrom.value = "ada"; elTo.value = "grace"; elAmt.value = "25.00";
        post("ada", "grace", 25);
      } else if (p === "unbalanced") {
        postUnbalanced("ada", "grace", 25, 20);
      } else if (p === "overdraft") {
        elFrom.value = "grace"; elTo.value = "ada"; elAmt.value = "50.00";
        post("grace", "ada", 50);
      } else if (p === "reset") {
        reset(); fillSelects(); renderAccounts(); renderLedger();
        message("", "Book reset. Ada 1000.00, Grace 0.00, Vault 500.00 opening balances.");
        elMsg.className = "lgr-msg";
      }
    });
  });

  // boot
  reset();
  fillSelects();
  renderAccounts();
  renderLedger();
})();
