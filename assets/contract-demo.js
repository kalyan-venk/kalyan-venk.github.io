/* ===========================================================================
   StreamLake data-contract validator, run entirely in the browser.

   This is a faithful port of the row-level checks in
   conf/contracts/silver_transactions.yml and the semantics in
   src/streamlake/contracts/checks.py. It validates ONE record against the
   silver.transactions contract and reports PASS or REJECTED with the exact
   assertion that broke, the same way the real engine reports a CheckResult
   (observed vs expected).

   What it deliberately does NOT do: the dataset-level checks (unique(trans_num),
   row_count, null_rate, freshness) cannot be judged from a single record, so
   they are named on the page but not run here. Everything below is a check
   that a single row can actually satisfy or break.
   =========================================================================== */
(function () {
  "use strict";

  // ---- a valid silver.transactions record, the checker's starting point ----
  var VALID = {
    trans_num: "1f2e3d4c5b6a79881c0f9e8d7c6b5a4f",
    trans_time: "2020-06-21T14:32:00",
    trans_date: "2020-06-21",
    trans_hour: 14,
    cc_num_last4: "4562",
    cc_num_hash: "a91f7c3e8b2d4f605e19c8a7b6d5e4f3",
    merchant: "Kub, Kessler and Sons",
    category: "grocery_pos",
    channel: "in_person",
    amt: 42.13,
    state: "OH",
    cardholder_age: 41,
    merch_lat: 40.12,
    merch_long: -82.55,
    distance_km: 6.4,
    is_fraud: 0
  };

  // ---- preset breakages, one field each, each one breaking a real check in the contract ----
  var PRESETS = {
    "amount above the $30k bound": function (r) { r.amt = 84999.99; },
    "negative amount": function (r) { r.amt = -12.5; },
    "category not on the list": function (r) { r.category = "electronics"; },
    "is_fraud outside {0,1}": function (r) { r.is_fraud = 2; },
    "merch_lat out of range": function (r) { r.merch_lat = 142.0; },
    "missing cc_num_hash": function (r) { r.cc_num_hash = null; },
    "cardholder_age 140 (warn only)": function (r) { r.cardholder_age = 140; }
  };

  // Non-nullable columns in the silver contract (schema: nullable:false).
  var REQUIRED = ["trans_num", "trans_time", "trans_date", "trans_hour",
                  "cc_num_last4", "cc_num_hash", "merchant", "category",
                  "channel", "amt", "state", "merch_lat", "merch_long", "is_fraud"];

  var CATEGORIES = ["entertainment", "food_dining", "gas_transport", "grocery_net",
                     "grocery_pos", "health_fitness", "home", "kids_pets", "misc_net",
                     "misc_pos", "personal_care", "shopping_net", "shopping_pos", "travel"];

  /* Each check returns { name, severity, passed, observed, expected }, echoing
     the real engine's CheckResult fields. severity "error" stops the run;
     "warn" is surfaced but does not. */
  var CHECKS = [
    {
      name: "not_null (required columns)", type: "schema", severity: "error",
      run: function (r) {
        var missing = REQUIRED.filter(function (c) { return r[c] === null || r[c] === undefined || r[c] === ""; });
        return { passed: missing.length === 0,
          observed: missing.length ? missing.length + " null in " + JSON.stringify(missing) : "0 nulls",
          expected: "0 nulls in " + REQUIRED.length + " non-nullable columns" };
      }
    },
    {
      name: "amt in [0, 30000]", type: "accepted_range", severity: "error",
      run: function (r) {
        var v = Number(r.amt);
        return { passed: v >= 0 && v <= 30000, observed: v, expected: "0 <= amt <= 30000" };
      }
    },
    {
      name: "category in the 14 accepted values", type: "accepted_values", severity: "error",
      run: function (r) {
        return { passed: CATEGORIES.indexOf(r.category) > -1, observed: r.category, expected: "category in " + JSON.stringify(CATEGORIES) };
      }
    },
    {
      name: "is_fraud in {0, 1}", type: "accepted_values", severity: "error",
      run: function (r) {
        var v = Number(r.is_fraud);
        return { passed: v === 0 || v === 1, observed: r.is_fraud, expected: "is_fraud in (0, 1)" };
      }
    },
    {
      name: "merch_lat in [-90, 90]", type: "accepted_range", severity: "error",
      run: function (r) {
        var v = Number(r.merch_lat);
        return { passed: v >= -90 && v <= 90, observed: v, expected: "-90 <= merch_lat <= 90" };
      }
    },
    {
      name: "merch_long in [-180, 180]", type: "accepted_range", severity: "error",
      run: function (r) {
        var v = Number(r.merch_long);
        return { passed: v >= -180 && v <= 180, observed: v, expected: "-180 <= merch_long <= 180" };
      }
    },
    {
      name: "cardholder_age in [0, 100]", type: "accepted_range", severity: "warn",
      run: function (r) {
        var v = Number(r.cardholder_age);
        return { passed: v >= 0 && v <= 100, observed: v, expected: "0 <= cardholder_age <= 100" };
      }
    },
    {
      name: "distance_km in [0, 20000]", type: "accepted_range", severity: "warn",
      run: function (r) {
        var v = Number(r.distance_km);
        return { passed: v >= 0 && v <= 20000, observed: v, expected: "0 <= distance_km <= 20000" };
      }
    }
  ];

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function validate() {
    var box = document.getElementById("cd-out");
    var raw = document.getElementById("cd-json").value;
    var rec;
    try { rec = JSON.parse(raw); }
    catch (e) {
      box.className = "cd-out show";
      box.innerHTML = '<div class="cd-verdict reject"><span class="cd-tag">PARSE ERROR</span>' +
        'The record is not valid JSON. Fix it and validate again.</div>' +
        '<pre class="cd-err">' + esc(e.message) + '</pre>';
      return;
    }

    var results = CHECKS.map(function (c) {
      var r = c.run(rec);
      return { name: c.name, type: c.type, severity: c.severity, passed: r.passed, observed: r.observed, expected: r.expected };
    });

    var errors = results.filter(function (r) { return !r.passed && r.severity === "error"; });
    var warns = results.filter(function (r) { return !r.passed && r.severity === "warn"; });
    var rejected = errors.length > 0;

    var head;
    if (rejected) {
      head = '<div class="cd-verdict reject"><span class="cd-tag">REJECTED</span>' +
        errors.length + ' error-severity assertion' + (errors.length > 1 ? 's' : '') +
        ' broke. The task raises, the DAG stops, and the warehouse keeps serving yesterday\'s correct data.</div>';
    } else if (warns.length) {
      head = '<div class="cd-verdict warn"><span class="cd-tag">PASS, with ' + warns.length + ' warning' + (warns.length > 1 ? 's' : '') + '</span>' +
        'Every error-severity assertion held. Warnings are recorded and surfaced on the dashboard, not a reason to stop the pipeline.</div>';
    } else {
      head = '<div class="cd-verdict pass"><span class="cd-tag">PASS</span>' +
        'All ' + results.length + ' row-level assertions held. This record is entitled to advance to gold.</div>';
    }

    var rows = results.map(function (r) {
      var state = r.passed ? "ok" : (r.severity === "warn" ? "warn" : "fail");
      var mark = r.passed ? "PASS" : (r.severity === "warn" ? "WARN" : "FAIL");
      return '<div class="cd-row ' + state + '">' +
        '<span class="cd-mark ' + state + '">' + mark + '</span>' +
        '<div class="cd-body"><code>' + esc(r.name) + '</code>' +
        '<span class="cd-meta">' + esc(r.type) + ' &middot; ' + esc(r.severity) + '</span>' +
        (r.passed ? '' : '<div class="cd-detail">observed <b>' + esc(r.observed) + '</b>, expected ' + esc(r.expected) + '</div>') +
        '</div></div>';
    }).join("");

    box.className = "cd-out show";
    box.innerHTML = head + '<div class="cd-rows">' + rows + '</div>' +
      '<p class="cd-note">unique(trans_num), row_count, null_rate and freshness run at the dataset level, so they are not judged on one record.</p>';
  }

  function setRecord(obj) {
    document.getElementById("cd-json").value = JSON.stringify(obj, null, 2);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setRecord(VALID);

    document.getElementById("cd-validate").addEventListener("click", validate);
    document.getElementById("cd-reset").addEventListener("click", function () {
      setRecord(VALID);
      var box = document.getElementById("cd-out");
      box.className = "cd-out";
      box.innerHTML = "";
    });

    var bar = document.getElementById("cd-presets");
    Object.keys(PRESETS).forEach(function (label) {
      var b = document.createElement("button");
      b.className = "cd-chip";
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () {
        var r = JSON.parse(JSON.stringify(VALID));
        PRESETS[label](r);
        setRecord(r);
        validate();
      });
      bar.appendChild(b);
    });

    validate();
  });
})();
