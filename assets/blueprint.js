/* ===========================================================================
   Tiny SVG diagram engine for the project blueprints (system design + code map).

   Was inlined three times, once per *-blueprint.html page. Those pages are gone;
   the diagrams now live inside each project page's #blueprints section, so this
   is one shared, cached file instead of three copies of the same ~450 lines.

   Public API:
     KVBlueprint.mount(svgId, wrapId, spec, stepsKey)

   Rendering is LAZY. mount() only reserves the diagram's aspect ratio and waits
   for an IntersectionObserver; the nodes, edges and packet routes are built the
   first time the diagram comes near the viewport. Building a map is ~350 SVG
   elements plus a getTotalLength() per edge (which forces layout), and a project
   page carries two of them, so doing that at load would cost the page's first
   paint for content that is well below the fold.

   No external deps. Coordinates come from the spec on a fixed pixel grid so
   connectors stay predictable. Companion styles: assets/blueprint.css (every
   rule scoped under .bpx — read the note at the top of that file before adding
   any).
   =========================================================================== */
(function(){
  "use strict";
  var NS="http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag,attrs,parent){
    var e=document.createElementNS(NS,tag);
    if(attrs) for(var k in attrs){ if(attrs[k]!==null&&attrs[k]!==undefined) e.setAttribute(k,attrs[k]); }
    if(parent) parent.appendChild(e);
    return e;
  }
  function text(parent,x,y,str,cls,size,anchor,weight){
    var t=el("text",{x:x,y:y,class:cls,"font-size":size,"text-anchor":anchor||"start"},parent);
    if(weight) t.setAttribute("font-weight",weight);
    t.textContent=str; return t;
  }

  /* Any node line wider than its box gets condensed to fit, so no label can
     escape a box no matter how the fonts land. Runs 3 times per diagram:
     immediately, on the next frame, and once webfonts are ready. */
  function clampText(svg){
    var ts=svg.querySelectorAll("text[data-avail]");
    for(var i=0;i<ts.length;i++){
      var t=ts[i],a=parseFloat(t.getAttribute("data-avail")),L=0;
      try{ L=t.getComputedTextLength(); }catch(e){}
      if(L>a+0.5){ t.setAttribute("textLength",Math.max(12,Math.round(a))); t.setAttribute("lengthAdjust","spacingAndGlyphs"); }
      else { t.removeAttribute("textLength"); }
    }
  }

  // colour per node kind: [fill, stroke]. blueprint.css restates these as
  // .nk-<kind> classes so they can flip with the theme; these inline values are
  // the zero-CSS fallback (an SVG rect with no fill renders black).
  var STYLE={
    resource:["#12182a","#3b4570"],
    stage:   ["#161a28","#232a3d"],
    stageKey:["#1b1f39","#4f5696"],
    gate:    ["#16232c","#347470"],
    artifact:["#12131c","#2a2f45"],
    result:  ["#191426","#5b3f86"],
    module:  ["#161a28","#2b3350"],
    notebook:["#14140f","#4d4a2a"],
    config:  ["#101a17","#2c5148"],
    meta:    ["#12131c","#262b3d"],
    deploy:  ["#1a1220","#6b3a6b"],
    data:    ["#12182a","#3b4570"]
  };

  /* ---- render one diagram from a spec ---- */
  function render(svg, spec){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox","0 0 "+spec.w+" "+spec.h);

    // defs: subtle node gradient sheen
    var defs=el("defs",{},svg);
    var g=el("linearGradient",{id:svg.id+"-sheen",x1:0,y1:0,x2:0,y2:1},defs);
    el("stop",{offset:"0%","stop-color":"#ffffff","stop-opacity":"0.03"},g);
    el("stop",{offset:"100%","stop-color":"#000000","stop-opacity":"0.10"},g);

    var edgeLayer=el("g",{class:"edges"},svg);
    var bandLayer=el("g",{class:"bands"},svg);
    var nodeLayer=el("g",{class:"nodes"},svg);

    // draw bands (background zones). Band labels are drawn with no width
    // clipping, so keep them to short category names.
    (spec.bands||[]).forEach(function(b){
      el("rect",{x:b.x,y:b.y,width:b.w,height:b.h,rx:16,fill:"none",class:"band-box",
        stroke:b.stroke||"#1a2030","stroke-dasharray":"4 6","stroke-width":1},bandLayer);
      if(b.label) text(bandLayer,b.x+16,b.y+22,b.label,"band-label",12,"start");
    });

    // index nodes by id, draw them
    var idx={};
    spec.nodes.forEach(function(n){
      idx[n.id]=n;
      var st=STYLE[n.kind]||STYLE.stage;
      var x=n.x,y=n.y,w=n.w,h=n.h;
      el("rect",{x:x,y:y,width:w,height:h,rx:13,class:"nk nk-"+n.kind,"data-id":n.id,fill:st[0],stroke:st[1],"stroke-width":1.2},nodeLayer);
      el("rect",{x:x,y:y,width:w,height:h,rx:13,fill:"url(#"+svg.id+"-sheen)",stroke:"none"},nodeLayer);
      // left accent stripe for key stages / results
      if(n.stripe) el("rect",{x:x,y:y+8,width:4,height:h-16,rx:2,fill:n.stripe},nodeLayer);

      var padL=x+ (n.stripe?18:16);
      var avail=(x+w)-padL-12;
      var ty=y+22;
      if(n.tag){ text(nodeLayer,x+w-12,y+20,n.tag,"stage-num",12.5,"end","600"); }
      text(nodeLayer,padL,ty,n.title,"n-title",n.titleSize||15.5,"start","700").setAttribute("data-avail",avail);
      ty+=16;
      if(n.sub){ text(nodeLayer,padL,ty,n.sub,"n-sub",12,"start").setAttribute("data-avail",avail); ty+=15; }
      (n.lines||[]).forEach(function(ln){
        var cls = ln.mono ? "n-mono" : "n-line";
        if(ln.cls) cls += " "+ln.cls;
        var t=text(nodeLayer,padL,ty, (ln.t!==undefined?ln.t:ln), cls, ln.size||12.4,"start");
        if(ln.fill) t.setAttribute("fill",ln.fill);
        t.setAttribute("data-avail",avail);
        ty+= (ln.gap||14.5);
      });
    });

    // draw edges as paths with ids; return anchor helper
    function anchor(node,side){
      var n=idx[node];
      switch(side){
        case "t": return {x:n.x+n.w/2, y:n.y};
        case "b": return {x:n.x+n.w/2, y:n.y+n.h};
        case "l": return {x:n.x, y:n.y+n.h/2};
        case "r": return {x:n.x+n.w, y:n.y+n.h/2};
        case "tl":return {x:n.x+22, y:n.y};
        case "tr":return {x:n.x+n.w-22, y:n.y};
        case "bl":return {x:n.x+22, y:n.y+n.h};
        case "br":return {x:n.x+n.w-22, y:n.y+n.h};
        default:  return {x:n.x+n.w/2, y:n.y+n.h/2};
      }
    }
    spec.edges.forEach(function(e,i){
      var a=anchor(e.from, e.fromSide||"b");
      var b=anchor(e.to, e.toSide||"t");
      var d;
      if(e.d){ d=e.d; }
      else if((e.fromSide||"b")==="b" && (e.toSide||"t")==="t" && Math.abs(a.x-b.x)<1){
        d="M"+a.x+","+a.y+" V"+b.y;                       // straight vertical
      } else if((e.fromSide==="r"&&e.toSide==="l")||(e.fromSide==="l"&&e.toSide==="r")){
        var mx=(a.x+b.x)/2;
        d="M"+a.x+","+a.y+" C"+mx+","+a.y+" "+mx+","+b.y+" "+b.x+","+b.y; // horizontal S
      } else {
        var my=(a.y+b.y)/2;
        d="M"+a.x+","+a.y+" C"+a.x+","+my+" "+b.x+","+my+" "+b.x+","+b.y; // vertical S
      }
      var EMAP={"#232a3d":"e-grey","#2a2f45":"e-grey","#2b3350":"e-grey","#2c3450":"e-grey",
        "#3b4570":"e-indigo","#5b4a24":"e-amber","#4d4a2a":"e-amber","#2c5148":"e-green","#4a2f4a":"e-pink"};
      el("path",{id:svg.id+"-e"+i,d:d,fill:"none",class:(EMAP[e.stroke]||"e-grey"),
        stroke:e.stroke||"#232a3d","stroke-width":e.sw||1.6,
        "stroke-dasharray":e.dash||null},edgeLayer);
    });

    // flow-dots layer on top
    el("g",{class:"flow-dots"},svg);
    return {idx:idx};
  }

  /* ---- packet animator (adapted from the site's flow.js) ---- */
  function animate(svg, spec){
    var layer=svg.querySelector(".flow-dots");

    // Every connector gets a dot: any edge not already covered by a spec.flow
    // route picks up a muted one, so no line sits there static and dead. Built
    // into a local list rather than pushed onto spec.flow, so re-mounting the
    // same spec cannot accumulate duplicate routes.
    var declared=spec.flow||[];
    var covered={};
    declared.forEach(function(r){ r.paths.forEach(function(i){ covered[i]=1; }); });
    var plan=declared.slice();
    for(var k=0,m=(spec.edges||[]).length;k<m;k++){
      if(!covered[k]) plan.push({paths:[k],cls:"muted",weight:1,dur:2400});
    }

    var routes=plan.map(function(r){
      var paths=[];
      for(var j=0;j<r.paths.length;j++){
        var e=svg.querySelector("#"+svg.id+"-e"+r.paths[j]);
        if(!e) return null;
        paths.push({el:e,len:e.getTotalLength()});
      }
      return {paths:paths,cls:r.cls||"data",weight:r.weight||1,dur:r.dur||6000,splits:r.splits||[]};
    }).filter(Boolean);
    if(!routes.length) return {play:function(){},pause:function(){}};

    var totalW=0; routes.forEach(function(r){totalW+=r.weight;});
    function pickRoute(){var x=Math.random()*totalW;for(var k=0;k<routes.length;k++){x-=routes[k].weight;if(x<=0)return routes[k];}return routes[routes.length-1];}
    function pickW(pairs){var tot=0,i;for(i=0;i<pairs.length;i++)tot+=pairs[i][1];var x=Math.random()*tot;for(i=0;i<pairs.length;i++){x-=pairs[i][1];if(x<=0)return pairs[i][0];}return pairs[pairs.length-1][0];}
    function pointAt(paths,t){var total=0,i;for(i=0;i<paths.length;i++)total+=paths[i].len;var d=t*total;for(i=0;i<paths.length;i++){if(d<=paths[i].len)return {p:paths[i].el.getPointAtLength(d),idx:i};d-=paths[i].len;}var last=paths[paths.length-1];return {p:last.el.getPointAtLength(last.len),idx:paths.length-1};}

    function spawn(){
      var r=pickRoute();
      var c=el("circle",{r:spec.r||5,class:"pkt "+r.cls},layer);
      var splits=r.splits.map(function(s){return {at:s.at,cls:s.pick?pickW(s.pick):s.cls,done:false};});
      var start=null;
      function step(ts){
        if(!start)start=ts;
        var t=(ts-start)/r.dur;
        if(t>=1){ if(c.parentNode)c.parentNode.removeChild(c); return; }
        var res=pointAt(r.paths,t);
        c.setAttribute("cx",res.p.x); c.setAttribute("cy",res.p.y);
        for(var s=0;s<splits.length;s++){ if(!splits[s].done&&res.idx>=splits[s].at){ c.setAttribute("class","pkt "+splits[s].cls); splits[s].done=true; } }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var timer=null;
    function play(){ if(timer||reduce)return; timer=setInterval(spawn,spec.every||800); for(var n=0;n<3;n++)setTimeout(spawn,n*300); }
    function pause(){ if(!timer)return; clearInterval(timer); timer=null; while(layer.firstChild)layer.removeChild(layer.firstChild); }
    return {play:play,pause:pause};
  }

  /* ---- build the flow breadcrumb; each chip spotlights its stage on hover ----
     The .flowsteps box is looked up inside this diagram's own frame, not
     document-wide: a page now carries two diagrams whose step keys ("system",
     "code") are generic enough to collide. */
  function buildSteps(svg, spec, key, scope){
    var box=(scope||document).querySelector('.flowsteps[data-steps="'+key+'"]');
    if(!box || !spec.steps) return;
    function spot(id,on){ var r=svg.querySelector('.nk[data-id="'+id+'"]'); if(r) r.classList.toggle("hl",on); }
    spec.steps.forEach(function(st,i){
      if(i){ var a=document.createElement("span"); a.className="farrow"; a.textContent="→"; box.appendChild(a); }
      var chip=document.createElement("span"); chip.className="fstep"; chip.setAttribute("tabindex","0");
      var dot=document.createElement("span"); dot.className="fdot";
      if(st.color){ dot.style.background=st.color; dot.style.color=st.color; }
      chip.appendChild(dot); chip.appendChild(document.createTextNode(st.label));
      chip.addEventListener("mouseenter",function(){ spot(st.target,true); });
      chip.addEventListener("mouseleave",function(){ spot(st.target,false); });
      chip.addEventListener("focus",function(){ spot(st.target,true); });
      chip.addEventListener("blur",function(){ spot(st.target,false); });
      box.appendChild(chip);
    });
  }

  /* ---- wire up a diagram: reserve space, then build it on approach ---- */
  function mount(svgId, wrapId, spec, stepsKey){
    var svg=document.getElementById(svgId), wrap=document.getElementById(wrapId);
    if(!svg || !wrap) return;
    var frame=wrap.closest?wrap.closest(".dgm-frame"):null;

    // hold the diagram's height before it exists, so building it later cannot
    // shift whatever the reader is looking at
    wrap.style.setProperty("--dgm-ar", spec.w+"/"+spec.h);

    var built=false, anim=null;
    function build(){
      if(built) return;
      built=true;
      render(svg,spec);
      clampText(svg);
      buildSteps(svg,spec,stepsKey,frame);
      anim=animate(svg,spec);
      wrap.classList.add("rendered");
      requestAnimationFrame(function(){ clampText(svg); });
      if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(function(){ clampText(svg); }); }
    }

    if(!("IntersectionObserver" in window)){ build(); if(anim) anim.play(); return; }

    // build a screen early, then let motion follow visibility
    new IntersectionObserver(function(en,obs){
      if(!en[0].isIntersecting) return;
      build();
      obs.disconnect();
      new IntersectionObserver(function(e2){ e2[0].isIntersecting?anim.play():anim.pause(); },{threshold:0.05}).observe(svg);
    },{rootMargin:"400px 0px"}).observe(wrap);

    document.addEventListener("visibilitychange",function(){
      if(!anim) return;
      document.hidden?anim.pause():anim.play();
    });
  }

  window.KVBlueprint={mount:mount};
})();
