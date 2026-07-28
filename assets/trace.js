/* ===========================================================================
   Agent-trace stepper for the secret-agent page. Pure client-side, no network.

   Replays one real run of the frameworkless loop in secret-agent: the model
   asks for a tool, the runtime executes it, the result goes back, and that
   repeats until the model answers with no tool call. Every tool name, argument
   shape and result here matches the actual runtime (tools/fs.py, rag/retrieve.py,
   agent.py) and the fictional Meridian corpus the repo ships.

   The trace is canned data, authored to mirror a genuine transcript. It is not
   a live model call. Numbers (token counts, durations, similarity scores) are
   plausible stand-ins in the ranges the repo produces; the corpus text, line
   numbers and tool contracts are exact.
   =========================================================================== */
(function(){
  "use strict";

  /* One trip through the loop, in run order. role is user | model | tool.
     model steps carry prompt tokens (the payload grows every turn, which is
     the whole reason context.py counts before each call). tool steps carry
     the call, its result, and a duration. */
  var TRACE = [
    {
      role:"user",
      text:"In the Meridian docs, when does Driftwood close a batch? Quote the exact rule and say which file it is in."
    },
    {
      role:"model", tokens:641,
      text:"I have not seen this documentation, so I will search it rather than answer from memory.",
      call:{ name:"search_docs", args:{ query:"when does Driftwood close a batch", k:4 } },
      note:"The prose and the tool call arrive in the same message. The loop stops on the ABSENCE of a call, not the presence of text, so narration like this does not end the run."
    },
    {
      role:"tool", name:"search_docs", ms:4130,
      args:{ query:"when does Driftwood close a batch", k:4 },
      result:
"[1] ingestion.md > Batch windows  (similarity 0.68)\n"+
"Driftwood batches records before landing them. The batch closes when either\n"+
"condition is met, whichever comes first: 50,000 records accumulated, or 90\n"+
"seconds elapsed since the batch opened.\n\n"+
"[2] glossary.md  (similarity 0.52)\n"+
"Batch: a group of records Driftwood accumulates before writing. Closes at\n"+
"50,000 records or 90 seconds, whichever comes first.",
      note:"search_docs is a tool the model chose to call, not a preprocessing step. It embeds the query against a 38-chunk index and passes the similarity scores through so the model can gauge how strong the match is."
    },
    {
      role:"model", tokens:1004,
      text:"The rule lives in ingestion.md under Batch windows. I will grep for the exact line before quoting it, rather than trusting the retrieved snippet.",
      call:{ name:"grep", args:{ pattern:"90 seconds", path:"corpus", glob:"*.md" } }
    },
    {
      role:"tool", name:"grep", ms:11,
      args:{ pattern:"90 seconds", path:"corpus", glob:"*.md" },
      result:"corpus/ingestion.md:25: - 90 seconds elapsed since the batch opened.",
      note:"grep runs with no approval prompt (default_policy allow), so its path goes through safe_resolve and its pattern through a catastrophic-backtracking check. corpus resolves inside the project root; anything outside it is rejected here, not later."
    },
    {
      role:"model", tokens:1148,
      text:"Line 25 in corpus/ingestion.md. Reading the surrounding lines to quote the whole rule verbatim.",
      call:{ name:"read_file", args:{ path:"corpus/ingestion.md", start_line:19, end_line:28 } }
    },
    {
      role:"tool", name:"read_file", ms:3,
      args:{ path:"corpus/ingestion.md", start_line:19, end_line:28 },
      result:
"19  ## Batch windows\n"+
"20  \n"+
"21  Driftwood batches records before landing them. The batch closes when either\n"+
"22  condition is met, whichever comes first:\n"+
"23  \n"+
"24  - 50,000 records accumulated, or\n"+
"25  - 90 seconds elapsed since the batch opened.\n"+
"26  \n"+
"27  Batches that close on the time condition rather than the size condition are\n"+
"28  tagged `partial=true` in Ledger. A connector where more than 70% of batches",
      note:"read_file prepends line numbers and resolves through the same safe_resolve. A path over 256KB, a directory, or a file matching looks_secret is refused before any open() runs."
    },
    {
      role:"model", tokens:1382,
      text:
"Driftwood closes a batch when either condition is met first: 50,000 records "+
"accumulated, or 90 seconds elapsed since the batch opened. It is documented in "+
"corpus/ingestion.md under \"Batch windows\" (lines 21 to 25). Batches that close "+
"on the time condition are tagged partial=true in Ledger.",
      note:"No tool call this turn, so the loop returns. The run took 4 model calls and 3 tool calls, with the model deciding at each turn whether it had enough."
    }
  ];

  var ROLE = {
    user:  { label:"user",  kind:"u" },
    model: { label:"model", kind:"m" },
    tool:  { label:"tool result", kind:"t" }
  };

  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  // pretty-print args the way the runtime echoes them: key=value, JSON-ish
  function fmtArgs(args){
    return Object.keys(args).map(function(k){
      var v = args[k];
      var s = typeof v === "string" ? '"'+v+'"' : String(v);
      return k+"="+s;
    }).join(", ");
  }

  function mount(rootId){
    var root = document.getElementById(rootId);
    if(!root) return;
    var i = 0;

    root.innerHTML =
      '<div class="tr-frame">'+
        '<div class="tr-bar">'+
          '<span class="tr-tag">agent.run()</span>'+
          '<span class="tr-dots"></span>'+
          '<span class="tr-count"></span>'+
        '</div>'+
        '<div class="tr-body"></div>'+
        '<div class="tr-controls">'+
          '<button class="tr-btn" data-act="prev" type="button">&larr; Prev</button>'+
          '<div class="tr-progress"><span class="tr-fill"></span></div>'+
          '<button class="tr-btn tr-next" data-act="next" type="button">Next &rarr;</button>'+
        '</div>'+
      '</div>';

    var body   = root.querySelector(".tr-body");
    var count  = root.querySelector(".tr-count");
    var fill   = root.querySelector(".tr-fill");
    var dotsEl = root.querySelector(".tr-dots");
    var prev   = root.querySelector('[data-act="prev"]');
    var next   = root.querySelector('[data-act="next"]');

    // one dot per step, click to jump
    var dhtml = "";
    for(var d=0; d<TRACE.length; d++) dhtml += '<span class="tr-dot" data-j="'+d+'"></span>';
    dotsEl.innerHTML = dhtml;
    var dots = dotsEl.querySelectorAll(".tr-dot");
    for(var q=0;q<dots.length;q++){
      dots[q].addEventListener("click", function(){ i = +this.getAttribute("data-j"); render(); });
    }

    function stepHTML(s){
      var r = ROLE[s.role];
      var h = '<div class="tr-step tr-'+r.kind+'">';
      h += '<div class="tr-head"><span class="tr-role tr-role-'+r.kind+'">'+r.label+'</span>';
      if(s.role==="model" && s.tokens) h += '<span class="tr-meta">'+s.tokens+' prompt tokens</span>';
      if(s.role==="tool")  h += '<span class="tr-meta">'+s.name+' &middot; '+s.ms+' ms</span>';
      h += '</div>';

      if(s.text) h += '<p class="tr-text">'+esc(s.text)+'</p>';

      if(s.role==="model" && s.call){
        h += '<div class="tr-call"><span class="tr-arrow">calls</span> '+
             '<code class="tr-fn">'+esc(s.call.name)+'</code>'+
             '<code class="tr-args">('+esc(fmtArgs(s.call.args))+')</code></div>';
      }
      if(s.role==="tool"){
        h += '<div class="tr-callback"><code class="tr-fn">'+esc(s.name)+'</code>'+
             '<code class="tr-args">('+esc(fmtArgs(s.args))+')</code> returned</div>';
        h += '<pre class="tr-result">'+esc(s.result)+'</pre>';
      }
      if(s.note) h += '<div class="tr-note">'+esc(s.note)+'</div>';
      h += '</div>';
      return h;
    }

    function render(){
      body.innerHTML = stepHTML(TRACE[i]);
      count.textContent = "step "+(i+1)+" / "+TRACE.length;
      fill.style.width = ((i+1)/TRACE.length*100)+"%";
      prev.disabled = (i===0);
      next.disabled = (i===TRACE.length-1);
      for(var k=0;k<dots.length;k++) dots[k].classList.toggle("on", k<=i);
    }

    prev.addEventListener("click", function(){ if(i>0){ i--; render(); } });
    next.addEventListener("click", function(){ if(i<TRACE.length-1){ i++; render(); } });
    root.addEventListener("keydown", function(e){
      if(e.key==="ArrowRight" && i<TRACE.length-1){ i++; render(); }
      if(e.key==="ArrowLeft"  && i>0){ i--; render(); }
    });
    root.setAttribute("tabindex","0");

    render();
  }

  window.KVTrace = { mount: mount };
})();
