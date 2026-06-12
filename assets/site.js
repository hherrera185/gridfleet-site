/* GridFleet — site.js · zero deps · the living fleet network + interactions */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- nav scrolled state ---- */
  var nav = document.getElementById("nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 24); }
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- reveal on scroll ---- */
  var revs = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revs.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 90 + "ms"; io.observe(el); });
  } else { revs.forEach(function (el) { el.classList.add("in"); }); }

  /* ---- count up ---- */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0, t0 = null, dur = 1100;
    function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
    if (!reduce) requestAnimationFrame(step);
  });

  /* ---- live snapshot: populate, but NEVER show "waiting" — keep confident defaults on failure ---- */
  (function () {
    var grid = document.getElementById("snap-grid"); if (!grid) return;
    var src = grid.getAttribute("data-src");
    fetch(src, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || typeof d !== "object") return;
      var map = { status: d.status || d.fleetStatus, roles: d.roles || d.specialistRoles, checks: d.checks || d.checksReported, receipts: d.receipts || d.receiptsAvailable };
      Object.keys(map).forEach(function (k) {
        if (map[k] == null) return;
        var el = grid.querySelector('[data-snap="' + k + '"]'); if (el) { el.textContent = map[k]; el.setAttribute("data-live", "1"); }
      });
    }).catch(function () { /* keep defaults — page stays credible */ });
  })();

  /* ---- the living fleet network (hero canvas) ---- */
  var cv = document.getElementById("fleet");
  if (!cv || reduce) return;
  var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var nodes = [], links = [], packets = [], mouse = { x: 0.5, y: 0.5 }, running = true;

  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  function build() {
    nodes = []; links = []; packets = [];
    var hubs = 7, others = Math.max(10, Math.round(W * H / 78000));
    for (var i = 0; i < hubs; i++) {
      var a = (i / hubs) * Math.PI * 2 - Math.PI / 2, r = Math.min(W, H) * (0.20 + 0.10 * (i % 2));
      nodes.push({ x: W / 2 + Math.cos(a) * r * 1.25, y: H / 2 + Math.sin(a) * r, hub: true, r: 3.4, bx: W / 2 + Math.cos(a) * r * 1.25, by: H / 2 + Math.sin(a) * r, ph: Math.random() * 6 });
    }
    for (var j = 0; j < others; j++) { nodes.push({ x: Math.random() * W, y: Math.random() * H, hub: false, r: 1.3, bx: Math.random() * W, by: Math.random() * H, ph: Math.random() * 6 }); }
    // links: hubs to nearest few
    for (var h = 0; h < hubs; h++) {
      var d = nodes.map(function (n, idx) { return { idx: idx, dd: Math.hypot(n.x - nodes[h].x, n.y - nodes[h].y) }; }).filter(function (o) { return o.idx !== h; }).sort(function (a, b) { return a.dd - b.dd; }).slice(0, 4);
      d.forEach(function (o) { links.push([h, o.idx]); });
    }
    for (var k = 0; k < 5; k++) spawnPacket();
  }
  function spawnPacket() {
    if (!links.length) return;
    var l = links[(Math.random() * links.length) | 0];
    packets.push({ a: l[0], b: l[1], t: 0, sp: 0.004 + Math.random() * 0.006 });
  }
  var tick = 0;
  function frame() {
    if (!running) return;
    tick += 0.01;
    ctx.clearRect(0, 0, W, H);
    var mx = (mouse.x - 0.5) * 26, my = (mouse.y - 0.5) * 26;
    // drift nodes
    nodes.forEach(function (n) {
      n.x = n.bx + Math.sin(tick + n.ph) * (n.hub ? 10 : 5) + mx * (n.hub ? 1 : 0.4);
      n.y = n.by + Math.cos(tick * 0.9 + n.ph) * (n.hub ? 8 : 4) + my * (n.hub ? 1 : 0.4);
    });
    // links
    links.forEach(function (l) {
      var a = nodes[l[0]], b = nodes[l[1]]; if (!a || !b) return;
      var dist = Math.hypot(a.x - b.x, a.y - b.y), op = Math.max(0, 0.16 - dist / 4200);
      ctx.strokeStyle = "rgba(54,224,255," + op + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    // packets (routed work)
    for (var i = packets.length - 1; i >= 0; i--) {
      var p = packets[i], a = nodes[p.a], b = nodes[p.b]; if (!a || !b) { packets.splice(i, 1); continue; }
      p.t += p.sp; if (p.t >= 1) { packets.splice(i, 1); if (Math.random() < 0.9) spawnPacket(); continue; }
      var x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
      var g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, "rgba(120,240,255,.95)"); g.addColorStop(1, "rgba(54,224,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#cdfaff"; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill();
    }
    // nodes
    nodes.forEach(function (n) {
      if (n.hub) {
        var pulse = 1 + Math.sin(tick * 2 + n.ph) * 0.3;
        var g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 16 * pulse); g.addColorStop(0, "rgba(54,224,255,.5)"); g.addColorStop(1, "rgba(54,224,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 16 * pulse, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#9fefff";
      } else { ctx.fillStyle = "rgba(138,160,182,.55)"; }
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  window.addEventListener("mousemove", function (e) { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; }, { passive: true });
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
  resize(); requestAnimationFrame(frame);
})();
