/* flow.js — animated packets travelling an SVG pipeline.
   Reads a spec from each <svg data-flow='{...}'> on the page.

   spec = {
     r: 5,                    // packet radius
     every: 900,              // ms between spawns
     routes: [{
       paths: ["e1","e2"],    // ids of <path> elements, traversed in order
       cls: "flow",           // starting class on the packet
       weight: 5,             // relative spawn frequency
       dur: 5200,             // ms to traverse the whole route
       splits: [              // optional recolouring partway through
         { at: 1, cls: "muted" },                     // deterministic
         { at: 3, pick: [["muted",0.734],["ok",0.266]] }  // weighted, chosen at spawn
       ]
     }]
   }
   Honours prefers-reduced-motion (renders the diagram, skips the packets)
   and pauses while off screen. */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pickWeighted(pairs) {
    var total = 0, i;
    for (i = 0; i < pairs.length; i++) total += pairs[i][1];
    var x = Math.random() * total;
    for (i = 0; i < pairs.length; i++) { x -= pairs[i][1]; if (x <= 0) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }

  function pointAt(paths, t) {
    var total = 0, i;
    for (i = 0; i < paths.length; i++) total += paths[i].len;
    var d = t * total;
    for (i = 0; i < paths.length; i++) {
      if (d <= paths[i].len) return { p: paths[i].el.getPointAtLength(d), idx: i };
      d -= paths[i].len;
    }
    var last = paths[paths.length - 1];
    return { p: last.el.getPointAtLength(last.len), idx: paths.length - 1 };
  }

  function init(svg) {
    var cfg;
    try { cfg = JSON.parse(svg.getAttribute("data-flow")); } catch (e) { return; }
    var layer = svg.querySelector(".flow-dots");
    if (!layer || !cfg.routes) return;

    var routes = [];
    for (var i = 0; i < cfg.routes.length; i++) {
      var r = cfg.routes[i], paths = [], ok = true;
      for (var j = 0; j < r.paths.length; j++) {
        var el = svg.querySelector("#" + r.paths[j]);
        if (!el) { ok = false; break; }
        paths.push({ el: el, len: el.getTotalLength() });
      }
      if (!ok || !paths.length) continue;
      routes.push({
        paths: paths, cls: r.cls || "flow", weight: r.weight || 1,
        dur: r.dur || 5200, splits: r.splits || []
      });
    }
    if (!routes.length) return;

    var totalW = 0;
    for (i = 0; i < routes.length; i++) totalW += routes[i].weight;

    function pickRoute() {
      var x = Math.random() * totalW;
      for (var k = 0; k < routes.length; k++) { x -= routes[k].weight; if (x <= 0) return routes[k]; }
      return routes[routes.length - 1];
    }

    function spawn() {
      var r = pickRoute();
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("r", cfg.r || 5);
      c.setAttribute("class", "pkt " + r.cls);
      layer.appendChild(c);

      // resolve each split's target class once, up front, so it stays stable
      var splits = r.splits.map(function (s) {
        return { at: s.at, cls: s.pick ? pickWeighted(s.pick) : s.cls, done: false };
      });

      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var t = (ts - start) / r.dur;
        if (t >= 1) { if (c.parentNode) c.parentNode.removeChild(c); return; }
        var res = pointAt(r.paths, t);
        c.setAttribute("cx", res.p.x);
        c.setAttribute("cy", res.p.y);
        for (var s = 0; s < splits.length; s++) {
          if (!splits[s].done && res.idx >= splits[s].at) {
            c.setAttribute("class", "pkt " + splits[s].cls);
            splits[s].done = true;
          }
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (reduce) return;

    var timer = null;
    function play() {
      if (timer) return;
      timer = setInterval(spawn, cfg.every || 900);
      for (var n = 0; n < 3; n++) setTimeout(spawn, n * 320);
    }
    function pause() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      while (layer.firstChild) layer.removeChild(layer.firstChild);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? play() : pause();
      }, { threshold: 0.08 }).observe(svg);
    } else { play(); }

    document.addEventListener("visibilitychange", function () {
      document.hidden ? pause() : play();
    });
  }

  function boot() {
    var svgs = document.querySelectorAll("svg[data-flow]");
    for (var i = 0; i < svgs.length; i++) init(svgs[i]);
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
