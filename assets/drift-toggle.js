/* ===========================================================================
   Drift toggle - a client-side state machine for the PredictOps drift gate.

   Injects data drift and watches the pipeline react: train, eval gate, drift
   gate, deploy. Drift off, the simulated PSI sits below the repo's 0.15
   threshold and both gates clear through to a promoted deploy. Drift on, the
   PSI crosses 0.15, the drift gate trips red and deploy is blocked.

   Real numbers only: ROC-AUC gate at 0.80 with the winning 0.846 model, PSI
   threshold 0.15, Staging to Production promotion. The two PSI readouts are
   labelled "simulated" on the page: they drive the toggle, they are not a
   measured repo result.

   No deps. Mounts into #drift-demo. Page-specific, not a shared asset.
   =========================================================================== */
(function(){
  "use strict";
  var mount = document.getElementById("drift-demo");
  if(!mount) return;

  var PSI_GATE = 0.15;   // repo drift threshold (Evidently PSI stattest)
  var PSI_OFF  = 0.04;   // simulated, reference vs reference-like current
  var PSI_ON   = 0.31;   // simulated, a feature shifted out from under the model
  var PSI_MAX  = 0.50;   // meter scale

  var stages = [
    {id:"train", tag:"01", nm:"Train", role:"LogReg vs XGBoost, 5-fold CV"},
    {id:"eval",  tag:"02", nm:"Eval gate", role:"ROC-AUC ≥ 0.80"},
    {id:"drift", tag:"03", nm:"Drift gate", role:"PSI ≤ 0.15"},
    {id:"deploy",tag:"04", nm:"Deploy", role:"Staging to Production"}
  ];

  var stageHTML = stages.map(function(s,i){
    var arrow = i ? '<span class="dt-arrow" aria-hidden="true">→</span>' : '';
    return arrow +
      '<div class="dt-stage" data-stage="'+s.id+'">'+
        '<div class="dt-stage-top"><span class="dt-badge">'+s.tag+'</span><span class="dt-dot"></span></div>'+
        '<div class="dt-stage-nm">'+s.nm+'</div>'+
        '<div class="dt-stage-role" data-role>'+s.role+'</div>'+
      '</div>';
  }).join("");

  var gatePct = (PSI_GATE/PSI_MAX*100).toFixed(1);

  mount.innerHTML =
    '<div class="dt-app">'+
      '<div class="dt-head">'+
        '<div>'+
          '<div class="dt-title">The drift gate, live</div>'+
          '<div class="dt-sub">Flip drift on and the simulated PSI crosses 0.15. The gate trips and blocks deploy.</div>'+
        '</div>'+
        '<button class="dt-switch" id="dt-switch" role="switch" aria-checked="false" type="button">'+
          '<span class="dt-switch-lbl">Inject data drift</span>'+
          '<span class="dt-track"><span class="dt-knob"></span></span>'+
        '</button>'+
      '</div>'+
      '<div class="dt-machine">'+stageHTML+'</div>'+
      '<div class="dt-meter">'+
        '<div class="dt-meter-head"><span>Simulated PSI</span><span class="dt-psi-val" id="dt-psi">0.04</span></div>'+
        '<div class="dt-track-bar">'+
          '<div class="dt-fill" id="dt-fill"></div>'+
          '<div class="dt-thresh" style="left:'+gatePct+'%"><span>gate 0.15</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="dt-status" id="dt-status"></div>'+
    '</div>';

  var sw     = document.getElementById("dt-switch");
  var fill   = document.getElementById("dt-fill");
  var psiEl  = document.getElementById("dt-psi");
  var status = document.getElementById("dt-status");
  var driftNode  = mount.querySelector('[data-stage="drift"]');
  var deployNode = mount.querySelector('[data-stage="deploy"]');
  var trainNode  = mount.querySelector('[data-stage="train"]');
  var evalNode   = mount.querySelector('[data-stage="eval"]');
  var deployRole = deployNode.querySelector("[data-role]");
  var driftRole  = driftNode.querySelector("[data-role]");

  function render(drift){
    var psi = drift ? PSI_ON : PSI_OFF;
    psiEl.textContent = psi.toFixed(2);
    fill.style.width = (psi/PSI_MAX*100).toFixed(1)+"%";
    fill.classList.toggle("over", drift);

    // train and eval always clear: the model is good (0.846 >= 0.80)
    trainNode.className = "dt-stage is-done";
    evalNode.className  = "dt-stage is-ok";

    driftNode.className  = "dt-stage " + (drift ? "is-bad" : "is-ok");
    deployNode.className = "dt-stage " + (drift ? "is-blocked" : "is-ok");
    driftRole.textContent  = drift ? "PSI 0.31 > 0.15" : "PSI 0.04 ≤ 0.15";
    deployRole.textContent = drift ? "deploy blocked" : "promoted to Production";

    sw.setAttribute("aria-checked", drift ? "true" : "false");
    sw.classList.toggle("on", drift);

    status.className = "dt-status " + (drift ? "bad" : "ok");
    status.innerHTML = drift
      ? '<b>Drift injected.</b> A feature shifted, the simulated PSI reads 0.31, above the 0.15 gate limit. The drift gate trips, and the run never reaches promotion. Nothing ships until the reference is refreshed and the model retrains.'
      : '<b>No drift.</b> The simulated PSI sits at 0.04, well under 0.15. Both gates pass, so the winning run promotes from Staging to Production and serves.';
  }

  sw.addEventListener("click", function(){ render(sw.getAttribute("aria-checked") !== "true"); });
  render(false);
})();
