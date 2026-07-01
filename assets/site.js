/* GridFleet - site.js v3 · zero deps · scroll-narrative + 3D-depth living fleet · mobile-tuned */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 760px)").matches;
  var fine = window.matchMedia("(pointer:fine)").matches;
  var docEl = document.documentElement;
  docEl.classList.add("js");

  var prog = document.createElement("div"); prog.className = "scroll-prog"; document.body.appendChild(prog);
  var nav = document.getElementById("nav");

  /* ---- scroll engine ---- */
  var scrollY = 0, vh = window.innerHeight, ticking = false, heroEnergy = 0;
  var parallaxEls = [].slice.call(document.querySelectorAll("[data-parallax]"));
  var heroInner = document.querySelector(".hero-inner");
  function readScroll() { scrollY = window.scrollY || window.pageYOffset; if (!ticking) { requestAnimationFrame(applyScroll); ticking = true; } }
  function applyScroll() {
    ticking = false;
    var max = (docEl.scrollHeight - vh) || 1;
    prog.style.transform = "scaleX(" + Math.min(1, scrollY / max) + ")";
    if (nav) nav.classList.toggle("scrolled", scrollY > 24);
    heroEnergy = Math.min(1, scrollY / vh);
    if (heroInner && !reduce) { heroInner.style.transform = "translateY(" + heroEnergy * 56 + "px)"; heroInner.style.opacity = String(1 - heroEnergy * 1.05); }
    if (!reduce && !isMobile) parallaxEls.forEach(function (el) { var sp = parseFloat(el.getAttribute("data-parallax")) || 0.12; var r = el.getBoundingClientRect(); el.style.transform = "translateY(" + (-(r.top + r.height / 2 - vh / 2) * sp) + "px)"; });
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", function () { vh = window.innerHeight; isMobile = window.matchMedia("(max-width:760px)").matches; applyScroll(); }, { passive: true });

  /* ---- kinetic headline ---- */
  (function () {
    var h1 = document.querySelector(".hero-title"); if (!h1 || reduce) return;
    var parts = h1.innerHTML.split(/(<br\s*\/?>|<span[^>]*>|<\/span>)/i), out = "", wi = 0;
    parts.forEach(function (seg) {
      if (/^<br|^<span|^<\/span>/i.test(seg)) { out += seg; return; }
      seg.split(/(\s+)/).forEach(function (w) { if (!w.trim()) { out += w; return; } out += '<span class="kw" style="--d:' + (wi * 0.055) + 's">' + w + "</span>"; wi++; });
    });
    h1.innerHTML = out; requestAnimationFrame(function () { h1.classList.add("kin-in"); });
  })();

  /* ---- reveals ---- */
  var revs = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revs.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 80 + "ms"; io.observe(el); });
    var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("in-view"); }); }, { threshold: 0.3 });
    document.querySelectorAll("section.band, section.access").forEach(function (s) { sio.observe(s); });
  } else { revs.forEach(function (el) { el.classList.add("in"); }); }

  /* ---- count up ---- */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0, done = false;
    var ob = new IntersectionObserver(function (es) { es.forEach(function (e) {
      if (e.isIntersecting && !done) { done = true; var t0 = null;
        function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1200); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
        if (!reduce) requestAnimationFrame(step); else el.textContent = target; ob.disconnect();
      }
    }); }, { threshold: 0.6 });
    ob.observe(el);
  });

  /* ---- magnetic buttons (desktop only) ---- */
  if (!reduce && fine) document.querySelectorAll(".btn-primary").forEach(function (b) {
    b.addEventListener("mousemove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.18 + "px," + (e.clientY - r.top - r.height / 2) * 0.28 + "px)"; });
    b.addEventListener("mouseleave", function () { b.style.transform = ""; });
  });

  /* ---- live snapshot (reads generator keys OR top-level; never "waiting") ---- */
  (function () {
    var grid = document.getElementById("snap-grid"); if (!grid) return;
    fetch(grid.getAttribute("data-src"), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return; var pub = d.public || {};
      var map = { status: d.status || pub.statusLabel, roles: d.roles || pub.specialistRoles, checks: d.checks || pub.checksReported, receipts: d.receipts || pub.receiptsAvailable };
      Object.keys(map).forEach(function (k) { if (map[k] == null) return; var el = grid.querySelector('[data-snap="' + k + '"]'); if (el) { el.textContent = map[k]; el.setAttribute("data-live", "1"); } });
    }).catch(function () {});
  })();

  /* ---- living fleet network: 3D-depth, scroll-reactive, mobile-tuned ---- */
  var cv = document.getElementById("fleet");
  if (!cv || reduce) { readScroll(); return; }
  var ctx = cv.getContext("2d"), W = 0, H = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  var nodes = [], links = [], packets = [], mouse = { x: 0.5, y: 0.5 }, running = true, tick = 0;
  var HUBS = 14; // the real fleet
  function resize() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build(); }
  function build() {
    nodes = []; links = []; packets = [];
    var others = isMobile ? Math.max(8, Math.round(W * H / 120000)) : Math.max(16, Math.round(W * H / 64000));
    for (var i = 0; i < HUBS; i++) {
      var a = (i / HUBS) * 6.283 - 1.57, ring = 0.16 + 0.14 * (i % 3) / 2, r = Math.min(W, H) * ring;
      var z = 0.5 + Math.random() * 0.5; // depth
      var x = W / 2 + Math.cos(a) * r * 1.5, y = H / 2 + Math.sin(a) * r * 1.15;
      nodes.push({ x: x, y: y, hub: true, z: z, r: 2.4 + z * 2, bx: x, by: y, ph: Math.random() * 6 });
    }
    for (var j = 0; j < others; j++) { var ox = Math.random() * W, oy = Math.random() * H, oz = 0.3 + Math.random() * 0.5; nodes.push({ x: ox, y: oy, hub: false, z: oz, r: 0.8 + oz, bx: ox, by: oy, ph: Math.random() * 6 }); }
    for (var h = 0; h < HUBS; h++) { var d = nodes.map(function (n, idx) { return { idx: idx, dd: Math.hypot(n.x - nodes[h].x, n.y - nodes[h].y) }; }).filter(function (o) { return o.idx !== h; }).sort(function (a, b) { return a.dd - b.dd; }).slice(0, 3); d.forEach(function (o) { links.push([h, o.idx]); }); }
    for (var k = 0; k < (isMobile ? 5 : 9); k++) spawnPacket();
  }
  function spawnPacket() { if (!links.length) return; var l = links[(Math.random() * links.length) | 0]; packets.push({ a: l[0], b: l[1], t: 0, sp: 0.004 + Math.random() * 0.006 }); }
  function frame() {
    if (!running) return;
    tick += 0.01 + heroEnergy * 0.018;
    ctx.clearRect(0, 0, W, H);
    var mx = (mouse.x - 0.5) * (isMobile ? 0 : 30), my = (mouse.y - 0.5) * (isMobile ? 0 : 30), zoom = 1 + heroEnergy * 0.4;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
    nodes.forEach(function (n) { var amp = (n.hub ? 10 : 5) * n.z; n.x = n.bx + Math.sin(tick + n.ph) * amp + mx * n.z; n.y = n.by + Math.cos(tick * 0.9 + n.ph) * amp * 0.8 + my * n.z; });
    links.forEach(function (l) { var a = nodes[l[0]], b = nodes[l[1]]; if (!a || !b) return; var dist = Math.hypot(a.x - b.x, a.y - b.y), op = Math.max(0, (0.18 + heroEnergy * 0.12) * ((a.z + b.z) / 2) - dist / 3800); ctx.strokeStyle = "rgba(54,224,255," + op + ")"; ctx.lineWidth = (a.z + b.z) / 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    for (var i = packets.length - 1; i >= 0; i--) { var p = packets[i], a = nodes[p.a], b = nodes[p.b]; if (!a || !b) { packets.splice(i, 1); continue; } p.t += p.sp * (1 + heroEnergy); if (p.t >= 1) { packets.splice(i, 1); if (Math.random() < 0.92) spawnPacket(); continue; } var x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t, g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, "rgba(120,240,255,.95)"); g.addColorStop(1, "rgba(54,224,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill(); ctx.fillStyle = "#cdfaff"; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill(); }
    nodes.sort(function (a, b) { return a.z - b.z; }).forEach(function (n) {
      if (n.hub) { var pulse = 1 + Math.sin(tick * 2 + n.ph) * 0.3, g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 18 * pulse * n.z); g.addColorStop(0, "rgba(54,224,255," + (0.5 * n.z) + ")"); g.addColorStop(1, "rgba(54,224,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 18 * pulse * n.z, 0, 6.283); ctx.fill(); ctx.fillStyle = "rgba(159,239,255," + (0.6 + n.z * 0.4) + ")"; }
      else { ctx.fillStyle = "rgba(138,160,182," + (0.3 + n.z * 0.4) + ")"; }
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
    });
    ctx.restore();
    requestAnimationFrame(frame);
  }
  if (fine) window.addEventListener("mousemove", function (e) { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; }, { passive: true });
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
  resize(); readScroll(); requestAnimationFrame(frame);
})();


/* ---- v4: live terminal -> receipt sequence ---- */
(function () {
  var body = document.getElementById("term-body");
  if (!body) return;
  var reduceT = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SEQ = [
    { cls: "cmd", html: '<span class="pr">$</span> POST /v1/dispatch', type: true },
    { cls: "dim", html: '  { role: "browser", task: "verify 40 court dockets" }', type: true },
    { cls: "arrow", html: '→ routing to specialist · <b>browser</b>', delay: 520 },
    { cls: "arrow", html: '→ navigating · extracting · capturing proof', delay: 760 },
    { cls: "arrow", html: '→ <span class="ok">3 sources verified</span>', delay: 620 },
    { receipt: true, delay: 460 },
  ];
  var RECEIPT =
    '<div class="rcpt"><div class="rcpt-h"><span>RECEIPT</span><span>req_8f3a…e71</span></div>' +
    '<div class="rcpt-r"><span>role</span><b>browser</b></div>' +
    '<div class="rcpt-r"><span>status</span><b class="ok">verified</b></div>' +
    '<div class="rcpt-r"><span>evidence</span><b>screenshot · source ×3</b></div>' +
    '<div class="rcpt-r"><span>latency</span><b>1.84s</b></div></div>';

  function typeLine(line, done) {
    var el = document.createElement("span");
    el.className = "tl " + line.cls;
    body.appendChild(el);
    if (reduceT || !line.type) { el.innerHTML = line.html; done(); return; }
    // type plain text fast, then swap to html (for tags like <b>)
    var plain = line.html.replace(/<[^>]+>/g, ""), i = 0;
    var caret = document.createElement("span"); caret.className = "caret"; el.appendChild(caret);
    var iv = setInterval(function () {
      i++;
      el.textContent = plain.slice(0, i);
      el.appendChild(caret);
      if (i >= plain.length) { clearInterval(iv); el.innerHTML = line.html; done(); }
    }, 24);
  }

  function run() {
    body.innerHTML = "";
    var idx = 0;
    function next() {
      if (idx >= SEQ.length) { setTimeout(function () { fade(); }, 3400); return; }
      var line = SEQ[idx++];
      if (line.receipt) {
        body.insertAdjacentHTML("beforeend", RECEIPT);
        var r = body.querySelector(".rcpt");
        requestAnimationFrame(function () { r && r.classList.add("show"); });
        setTimeout(next, line.delay || 400);
        return;
      }
      typeLine(line, function () { setTimeout(next, line.delay || 220); });
    }
    next();
  }
  function fade() {
    body.style.transition = "opacity .5s"; body.style.opacity = "0";
    setTimeout(function () { body.style.opacity = "1"; run(); }, 600);
  }
  // start when hero in view
  if ("IntersectionObserver" in window) {
    var started = false;
    var ob = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !started) { started = true; run(); } }); }, { threshold: 0.2 });
    ob.observe(body);
  } else { run(); }
})();

/* ---- v7: command-deck roster activation ---- */
(function () {
  var roster = document.getElementById("agent-roster");
  var log = document.getElementById("command-log");
  var build = document.getElementById("build-pulse");
  if (!roster || !log) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var agents = [].slice.call(roster.querySelectorAll("span"));
  var routes = [
    { text: "docket watch - CLU intake - TRON canon - BECK monitor - receipt", hot: ["CLU", "TRON", "BECK"], build: "source linked" },
    { text: "config review - ARES/SARK - RAM context - receipt", hot: ["ARES", "SARK", "RAM"], build: "risk lane" },
    { text: "creative reveal - LORA art lane - ECHO release check - receipt", hot: ["LORA", "ECHO"], build: "green build" },
    { text: "client workflow - ABLE scope - DUMONT ops - TESLER comms - receipt", hot: ["ABLE", "DUMONT", "TESLER"], build: "scoped" },
    { text: "public claim - TRON safety - QUORRA boundary - YORI hold - receipt", hot: ["TRON", "QUORRA", "YORI"], build: "canon pass" }
  ];
  var i = 0;
  function show() {
    var r = routes[i++ % routes.length];
    log.textContent = r.text;
    if (build) build.textContent = r.build;
    agents.forEach(function (a) { a.classList.toggle("hot", r.hot.indexOf(a.textContent.trim()) !== -1); });
  }
  show();
  if (!reduce) setInterval(show, 2200);
})();

/* ---- early-access form handler: POSTs JSON to the /api/early-access worker.
   Forms opt in with the data-early-access attribute. Without JS the form
   falls back to a native POST to the same endpoint (worker also accepts
   form-encoded bodies). ---- */
(function () {
  "use strict";

  var ENDPOINT = "/api/early-access";

  function setStatus(form, ok, text) {
    var el = form.querySelector(".form-status");
    if (!el) {
      el = document.createElement("p");
      el.className = "form-status";
      el.setAttribute("role", "status");
      form.appendChild(el);
    }
    el.style.display = "block";
    el.style.color = ok ? "#3ddc97" : "#ff8f8f";
    el.textContent = text;
  }

  function buildMessage(form) {
    var parts = [];
    var msg = form.querySelector('[name="message"]');
    if (msg && msg.value.trim()) parts.push(msg.value.trim());
    ["company", "volume", "risk"].forEach(function (extra) {
      var f = form.querySelector('[name="' + extra + '"]');
      if (f && f.value.trim()) parts.push(extra + ": " + f.value.trim());
    });
    return parts.join("\n");
  }

  function handleSubmit(ev) {
    var form = ev.target;
    if (!window.fetch) return; // let native form POST handle it
    ev.preventDefault();

    var emailField = form.querySelector('[name="email"]');
    var nameField = form.querySelector('[name="name"]');
    var hpField = form.querySelector('[name="website"]');
    var btn = form.querySelector('button[type="submit"]');

    var payload = {
      email: emailField ? emailField.value.trim() : "",
      name: nameField ? nameField.value.trim() : "",
      message: buildMessage(form),
      website: hpField ? hpField.value : ""
    };

    if (btn) { btn.disabled = true; }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (j) { return { status: res.status, body: j }; });
      })
      .then(function (r) {
        if (r.status === 200 && r.body && r.body.ok) {
          setStatus(form, true, "Request received — we'll be in touch.");
          form.reset();
        } else {
          var detail = r.body && r.body.error ? " (" + r.body.error + ")" : "";
          setStatus(form, false, "Something went wrong" + detail + ". Please retry or email sales@gridfleet.ai.");
        }
      })
      .catch(function () {
        setStatus(form, false, "Network error. Please retry or email sales@gridfleet.ai.");
      })
      .finally(function () {
        if (btn) { btn.disabled = false; }
      });
  }

  function init() {
    var forms = document.querySelectorAll("form[data-early-access]");
    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener("submit", handleSubmit);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
