(function () {
  var input = document.getElementById('scoreInput');
  var value = document.getElementById('scoreValue');
  var state = document.getElementById('decisionState');
  var score = document.getElementById('decisionScore');
  var title = document.getElementById('decisionTitle');
  var text = document.getElementById('decisionText');
  var traceScore = document.getElementById('traceScore');
  var traceAction = document.getElementById('traceAction');
  var traceDetail = document.getElementById('traceDetail');
  var traceStatus = document.getElementById('traceStatus');
  var presets = document.querySelectorAll('[data-score]');

  function render(raw) {
    var current = Number(raw);
    var shown = current.toFixed(2);
    value.textContent = shown;
    score.textContent = 'Score ' + shown;
    traceScore.textContent = 'Returned ' + shown + ' to the policy layer';

    state.className = 'cb-state';
    if (current < 0.33) {
      state.classList.add('cb-state-refuse');
      state.textContent = 'No automatic filing';
      title.textContent = 'Stop the dispute workflow';
      text.textContent = 'The score is below the filing boundary. The server files nothing and directs the customer to support.';
      traceAction.textContent = 'policy_guard';
      traceDetail.textContent = 'Dispute filing blocked below 0.33';
      traceStatus.textContent = 'blocked';
    } else if (current < 0.67) {
      state.classList.add('cb-state-review');
      state.textContent = 'Human review';
      title.textContent = 'File and escalate the dispute';
      text.textContent = 'The score is uncertain. The system records the dispute with an escalation reason so a human can review it.';
      traceAction.textContent = 'file_dispute';
      traceDetail.textContent = 'Ownership checked and escalation reason stored';
      traceStatus.textContent = 'review';
    } else {
      state.classList.add('cb-state-file');
      state.textContent = 'Dispute filed';
      title.textContent = 'Complete the guarded filing';
      text.textContent = 'The score clears the automatic boundary. The server verifies ownership and duplicate state before filing the dispute.';
      traceAction.textContent = 'file_dispute';
      traceDetail.textContent = 'Ownership and duplicate checks passed';
      traceStatus.textContent = 'filed';
    }

    presets.forEach(function (button) {
      button.classList.toggle('is-active', Number(button.dataset.score) === current);
    });
  }

  input.addEventListener('input', function () { render(input.value); });
  presets.forEach(function (button) {
    button.addEventListener('click', function () {
      input.value = button.dataset.score;
      render(input.value);
    });
  });

  render(input.value);
})();
