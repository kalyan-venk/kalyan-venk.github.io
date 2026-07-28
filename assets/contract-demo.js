/* ===========================================================================
   StreamLake data-contract validator, run entirely in the browser.

   This is a faithful port of the row-level checks in
   conf/contracts/silver_trips.yml and the semantics in
   src/streamlake/contracts/checks.py. It validates ONE record against the
   silver.trips contract and reports PASS or REJECTED with the exact assertion
   that broke, the same way the real engine reports a CheckResult (observed vs
   expected).

   What it deliberately does NOT do: the dataset-level checks (unique(trip_id),
   row_count, null_rate, freshness) cannot be judged from a single record, so
   they are named on the page but not run here. Everything below is a check
   that a single row can actually satisfy or break.
   =========================================================================== */
(function () {
  "use strict";

  // ---- a valid silver.trips record, the checker's starting point ----
  var VALID = {
    trip_id: "2024-01-7f3c9a12",
    pickup_ts: "2024-01-15T08:31:00",
    dropoff_ts: "2024-01-15T08:52:00",
    pickup_date: "2024-01-15",
    passenger_count: 1,
    trip_distance_mi: 3.4,
    trip_duration_min: 21.0,
    avg_speed_mph: 9.7,
    payment_type: 1,
    tip_pct: 18.5,
    total_amount: 24.30
  };

  // ---- preset breakages, one field each, drawn from real TLC failure modes ----
  var PRESETS = {
    "negative fare": function (r) { r.total_amount = -37.5; },
    "time runs backwards": function (r) { r.dropoff_ts = "2024-01-15T08:12:00"; },
    "300-mile cab ride": function (r) { r.trip_distance_mi = 512.0; r.avg_speed_mph = 210; },
    "bad payment_type": function (r) { r.payment_type = 9; },
    "missing pickup_ts": function (r) { r.pickup_ts = null; },
    "date disagrees with ts": function (r) { r.pickup_date = "2024-01-14"; },
    "huge tip (warn only)": function (r) { r.tip_pct = 140; }
  };

  // Non-nullable columns in the silver contract (schema: nullable:false).
  var REQUIRED = ["trip_id", "pickup_ts", "dropoff_ts", "pickup_date",
                  "trip_distance_mi", "trip_duration_min", "total_amount"];

  function tsval(v) { var t = Date.parse(v); return isNaN(t) ? null : t; }
  function dateOf(v) { return (typeof v === "string" && v.indexOf("T") > -1) ? v.slice(0, 10) : null; }

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
      name: "dropoff_ts > pickup_ts", type: "expression", severity: "error",
      run: function (r) {
        var a = tsval(r.pickup_ts), b = tsval(r.dropoff_ts);
        var ok = a !== null && b !== null && b > a;
        return { passed: ok, observed: r.pickup_ts + " to " + r.dropoff_ts, expected: "dropoff_ts > pickup_ts" };
      }
    },
    {
      name: "trip_duration_min in (0, 1440]", type: "expression", severity: "error",
      run: function (r) {
        var d = Number(r.trip_duration_min);
        return { passed: d > 0 && d <= 1440, observed: d, expected: "trip_duration_min > 0 AND <= 1440" };
      }
    },
    {
      name: "pickup_date = date(pickup_ts)", type: "expression", severity: "error",
      run: function (r) {
        var d = dateOf(r.pickup_ts);
        return { passed: d !== null && r.pickup_date === d, observed: r.pickup_date + " vs " + d, expected: "partition column agrees with pickup_ts" };
      }
    },
    {
      name: "trip_distance_mi in [0, 300]", type: "accepted_range", severity: "error",
      run: function (r) {
        var v = Number(r.trip_distance_mi);
        return { passed: v >= 0 && v <= 300, observed: v, expected: "0 <= trip_distance_mi <= 300" };
      }
    },
    {
      name: "total_amount in [0, 100000]", type: "accepted_range", severity: "error",
      run: function (r) {
        var v = Number(r.total_amount);
        return { passed: v >= 0 && v <= 100000, observed: v, expected: "0 <= total_amount <= 100000" };
      }
    },
    {
      name: "payment_type in {0..6}", type: "accepted_values", severity: "error",
      run: function (r) {
        var v = Number(r.payment_type);
        return { passed: [0, 1, 2, 3, 4, 5, 6].indexOf(v) > -1, observed: r.payment_type, expected: "payment_type in (0,1,2,3,4,5,6)" };
      }
    },
    {
      name: "avg_speed_mph in [0, 150]", type: "accepted_range", severity: "warn",
      run: function (r) {
        var v = Number(r.avg_speed_mph);
        return { passed: v >= 0 && v <= 150, observed: v, expected: "0 <= avg_speed_mph <= 150" };
      }
    },
    {
      name: "tip_pct in [0, 100]", type: "accepted_range", severity: "warn",
      run: function (r) {
        var v = Number(r.tip_pct);
        return { passed: v >= 0 && v <= 100, observed: v, expected: "0 <= tip_pct <= 100" };
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
      '<p class="cd-note">unique(trip_id), row_count, null_rate and freshness run at the dataset level, so they are not judged on one record.</p>';
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
