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
    if (heroInner && !reduce) {
      // Graceful, long scroll-linked dissolve: hold full opacity through the first
      // ~18% of a viewport, then ease out over ~1.6 viewports with a smoothstep curve
      // so the headline drifts away gently instead of snapping out.
      var fp = Math.min(1, Math.max(0, (scrollY - vh * 0.18) / (vh * 1.6)));
      var eased = fp * fp * (3 - 2 * fp);
      heroInner.style.transform = "translateY(" + (eased * 64) + "px)";
      heroInner.style.opacity = String(1 - eased * 0.97);
    }
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

  /* ---- kinetic section headings: per-word rise+de-blur on scroll-in ---- */
  (function () {
    if (reduce || !("IntersectionObserver" in window)) return;
    // DOM-aware splitter: wraps words in <span class="kw"> while preserving inner tags (em/a/span)
    function kineticize(el) {
      if (el.dataset.kin) return; el.dataset.kin = "1";
      var wi = 0;
      function wrapText(node) {
        var frag = document.createDocumentFragment();
        node.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (!tok.trim()) { frag.appendChild(document.createTextNode(tok)); return; }
          var s = document.createElement("span"); s.className = "kw";
          s.style.setProperty("--d", (wi * 0.05) + "s"); s.textContent = tok; wi++;
          frag.appendChild(s);
        });
        node.parentNode.replaceChild(frag, node);
      }
      (function walk(parent) {
        [].slice.call(parent.childNodes).forEach(function (n) {
          if (n.nodeType === 3) { if (n.nodeValue.trim()) wrapText(n); }
          else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
        });
      })(el);
      el.classList.add("kinetic");
    }
    var heads = [].slice.call(document.querySelectorAll(".section-title, .lead")).filter(function (el) {
      return !el.classList.contains("hero-title");
    });
    var kio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("kin-in"); kio.unobserve(e.target); } });
    }, { threshold: 0.25, rootMargin: "0px 0px -8% 0px" });
    heads.forEach(function (el) { kineticize(el); kio.observe(el); });
  })();

  /* ---- reveals ---- */
  var revs = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revs.forEach(function (el) {
      // stagger by position among sibling .reveal elements so grids cascade
      var sibs = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList && c.classList.contains("reveal"); });
      var idx = sibs.indexOf(el); if (idx < 0) idx = 0;
      el.style.transitionDelay = (idx % 6) * 70 + "ms"; io.observe(el);
    });
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
  var mouse = { x: 0.5, y: 0.5 }, running = true, tick = 0, flow = 0;
  var ROWS = isMobile ? 13 : 18;   // receding horizontal grid lines per plane
  var COLS = isMobile ? 9 : 15;    // converging vertical lines each side of centre
  var trails = [], stars = [];
  var CY = "54,224,255", VI = "126,108,255";
  // depth d in [0,1): 0 = far horizon, 1 = near viewer. Eased so lines bunch near the horizon.
  function persp(d) { return d / (1 + (1 - d) * 2.2); }
  function resize() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build(); }
  function spawnTrail(t) {
    trails.push({ col: ((Math.random() * COLS * 2) | 0) - COLS, floor: Math.random() < 0.62, t: t || 0, sp: 0.0024 + Math.random() * 0.0044, vio: Math.random() < 0.28 });
  }
  function build() {
    trails = []; stars = [];
    for (var i = 0, n = isMobile ? 5 : 10; i < n; i++) spawnTrail(Math.random());
    for (var s = 0, sc = isMobile ? 24 : 52; s < sc; s++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 6 });
  }
  function frame() {
    if (!running) return;
    var speed = 1 + heroEnergy * 1.5;
    flow = (flow + (0.0017 + heroEnergy * 0.0024) * (isMobile ? 0.8 : 1)) % 1;
    tick += 0.016;
    ctx.clearRect(0, 0, W, H);
    var horizon = H * 0.5, half = H * 0.5;
    var vpx = W / 2 + (mouse.x - 0.5) * (isMobile ? 0 : W * 0.06);
    var spread = W * (isMobile ? 0.98 : 0.82);

    // horizon bloom + line
    var hg = ctx.createRadialGradient(vpx, horizon, 0, vpx, horizon, W * 0.62);
    hg.addColorStop(0, "rgba(54,224,255,0.20)"); hg.addColorStop(0.42, "rgba(54,224,255,0.05)"); hg.addColorStop(1, "rgba(54,224,255,0)");
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(170,242,255,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();

    // depth haze near the horizon
    stars.forEach(function (st) {
      var y = horizon + (st.y - 0.5) * half * 0.55;
      var op = (0.08 + st.z * 0.20) * (0.5 + 0.5 * Math.sin(tick + st.ph));
      ctx.fillStyle = "rgba(170,242,255," + op + ")";
      ctx.fillRect(st.x * W, y, 1.3 + st.z, 1.3 + st.z);
    });

    function drawPlane(sign) {
      var c, r;
      for (c = -COLS; c <= COLS; c++) {
        var xNear = vpx + (c / COLS) * spread;
        ctx.strokeStyle = "rgba(54,224,255," + (0.05 + 0.06 * (1 - Math.abs(c) / COLS)) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(vpx, horizon); ctx.lineTo(xNear, horizon + sign * half); ctx.stroke();
      }
      for (r = 0; r < ROWS; r++) {
        var d = ((r + flow) % ROWS) / ROWS, pd = persp(d);
        var y = horizon + sign * half * pd;
        var op2 = Math.pow(d, 1.25) * 0.5 * Math.min(1, d * 8);
        var wHalf = spread * pd;
        ctx.strokeStyle = "rgba(54,224,255," + op2 + ")";
        ctx.lineWidth = 0.6 + pd * 1.7;
        ctx.beginPath(); ctx.moveTo(vpx - wHalf, y); ctx.lineTo(vpx + wHalf, y); ctx.stroke();
      }
    }
    drawPlane(1); drawPlane(-1);

    // light-cycle data-trails accelerating toward the viewer along a lane
    for (var i = trails.length - 1; i >= 0; i--) {
      var tr = trails[i]; tr.t += tr.sp * speed;
      if (tr.t >= 1) { trails.splice(i, 1); spawnTrail(0); continue; }
      var sg = tr.floor ? 1 : -1, pd2 = persp(tr.t);
      var x2 = vpx + (tr.col / COLS) * spread * pd2, y2 = horizon + sg * half * pd2;
      var pdT = persp(Math.max(0, tr.t - 0.12));
      var xT = vpx + (tr.col / COLS) * spread * pdT, yT = horizon + sg * half * pdT;
      var col = tr.vio ? VI : CY;
      var lg = ctx.createLinearGradient(xT, yT, x2, y2);
      lg.addColorStop(0, "rgba(" + col + ",0)"); lg.addColorStop(1, "rgba(" + col + "," + (0.45 + pd2 * 0.45) + ")");
      ctx.strokeStyle = lg; ctx.lineWidth = 1 + pd2 * 3.2;
      ctx.beginPath(); ctx.moveTo(xT, yT); ctx.lineTo(x2, y2); ctx.stroke();
      var rr = 2 + pd2 * 7;
      var g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, rr * 2.4);
      g2.addColorStop(0, "rgba(" + col + ",0.95)"); g2.addColorStop(1, "rgba(" + col + ",0)");
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x2, y2, rr * 2.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(214,250,255,0.95)"; ctx.beginPath(); ctx.arc(x2, y2, Math.max(1, rr * 0.5), 0, 6.283); ctx.fill();
    }
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

/* ---- fable5: command-deck avatar + title cycler (reads public fleet roster) ----
   Cycles the on-deck portrait image and its role TITLE through the fleet with a
   smooth crossfade. Pauses on hover. Degrades to the seeded first agent if the
   roster is unreachable or motion is reduced. Public-safe: title + avatar only. */
(function () {
  var portrait = document.querySelector(".operator-portrait");
  var a = document.getElementById("op-av-a"), b = document.getElementById("op-av-b");
  var title = document.getElementById("deck-title"), code = document.getElementById("op-code");
  if (!portrait || !a || !b || !title || !window.fetch) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  fetch("/data/fleet-roster.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var list = d && d.roster ? d.roster : null;
      if (!list || !list.length) return;
      // preload so crossfades never flash
      list.forEach(function (m) { var im = new Image(); im.src = m.avatar; });
      // seed first frame from the roster (overrides static markup)
      a.src = list[0].avatar; a.classList.add("is-on"); b.classList.remove("is-on");
      title.textContent = list[0].title; if (code) code.textContent = list[0].code;
      if (reduce || list.length < 2) return;
      var i = 0, showingA = true, paused = false;
      function step() {
        if (paused || document.hidden) return;
        i = (i + 1) % list.length;
        var m = list[i];
        var incoming = showingA ? b : a, outgoing = showingA ? a : b;
        incoming.src = m.avatar;
        title.classList.add("swap");
        setTimeout(function () {
          title.textContent = m.title; if (code) code.textContent = m.code;
          title.classList.remove("swap");
        }, 360);
        incoming.classList.add("is-on"); outgoing.classList.remove("is-on");
        showingA = !showingA;
      }
      var deck = portrait.closest(".command-deck") || portrait;
      deck.addEventListener("mouseenter", function () { paused = true; });
      deck.addEventListener("mouseleave", function () { paused = false; });
      setInterval(step, 3200);
    }).catch(function () {});
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
    ["plan", "company", "volume", "risk"].forEach(function (extra) {
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

  function initPlanButtons() {
    // Pricing CTAs carry data-plan; clicking one preselects the matching
    // option in the signup form's plan <select> before the anchor scroll.
    var buttons = document.querySelectorAll("[data-plan]");
    var select = document.querySelector('form[data-early-access] [name="plan"]');
    if (!select || !buttons.length) return;
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var want = this.getAttribute("data-plan");
        for (var j = 0; j < select.options.length; j++) {
          if (select.options[j].value === want) { select.selectedIndex = j; break; }
        }
      });
    }
  }

  function init() {
    var forms = document.querySelectorAll("form[data-early-access]");
    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener("submit", handleSubmit);
    }
    initPlanButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ---- WOW pass 2: live proof band. Count-up on scroll-in, sourced from the
   public-safe metrics snapshot. Degrades gracefully (band stays hidden) if the
   JSON is unreachable or lacks enough real, fresh data — never a broken "0". ---- */
(function () {
  "use strict";
  var band = document.querySelector("[data-proofband]");
  if (!band || !window.fetch) return;
  var grid = band.querySelector("[data-proofband-grid]");
  var noteEl = band.querySelector("[data-proofband-note]");
  if (!grid) return;
  var staticMode = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) || !("IntersectionObserver" in window);

  function fetchSnap() {
    return fetch("/assets/public-grid-metrics.snapshot.json", { cache: "no-store" })
      .then(function (r) {
        if (r.ok) return r.json();
        return fetch("/data/public-grid-metrics.snapshot.json", { cache: "no-store" }).then(function (r2) { if (!r2.ok) throw new Error("no snapshot"); return r2.json(); });
      });
  }
  function val(m) { return m.latest_snapshot_value != null ? m.latest_snapshot_value : (m.rolling_window_value != null ? m.rolling_window_value : (m.combined_lifetime_total != null ? m.combined_lifetime_total : m.current_value)); }
  function isFresh(m) { return m.status === "ok" && m.freshness && m.freshness.state === "fresh"; }
  function tagFor(m) {
    if (m.confidence_level && m.confidence_level !== "high") return { cls: "pb-tag-est", txt: "estimated" };
    if (m.live_tracking_status === "live_connected" && isFresh(m)) return { cls: "pb-tag-live", txt: "measured · live" };
    return { cls: "", txt: "measured · verified" };
  }
  function fmt(n) { return new Intl.NumberFormat("en-US").format(n); }

  function build(data) {
    var metrics = (data && data.metrics) || [];
    // curation + order live in the public-safe snapshot (proof_band_order); JS carries no metric ids
    var chosen = metrics.filter(function (m) {
      if (!m || !m.public_safe || (m.allowed_surfaces || []).indexOf("gridfleet_ai") < 0) return false;
      if (typeof m.proof_band_order !== "number") return false;
      if (!(isFresh(m) || m.metric_type === "roster_count")) return false; // never stale
      var v = val(m);
      return v != null && !isNaN(Number(v));
    }).sort(function (a, b) { return a.proof_band_order - b.proof_band_order; });
    if (chosen.length < 3) return false; // not enough real data -> keep band hidden
    chosen = chosen.slice(0, 7);

    grid.innerHTML = "";
    chosen.forEach(function (m, i) {
      var v = Math.round(Number(val(m)));
      var suf = m.metric_type === "percentage" ? "%" : "";
      var tag = tagFor(m);
      var card = document.createElement("div");
      card.className = "pb-stat";
      card.style.setProperty("--d", (i * 70) + "ms");
      var valDiv = document.createElement("div");
      valDiv.className = "pb-val";
      valDiv.setAttribute("data-pbcount", String(v));
      valDiv.setAttribute("data-suf", suf);
      var num = document.createElement("span");
      num.className = "pb-num";
      num.textContent = staticMode ? fmt(v) : "0";
      valDiv.appendChild(num);
      if (suf) { var s = document.createElement("span"); s.className = "pb-suf"; s.textContent = suf; valDiv.appendChild(s); }
      var lab = document.createElement("div");
      lab.className = "pb-label";
      lab.textContent = m.public_label || "";
      var tg = document.createElement("div");
      tg.className = "pb-tag " + tag.cls;
      tg.appendChild(document.createElement("i"));
      tg.appendChild(document.createTextNode(tag.txt));
      card.appendChild(valDiv); card.appendChild(lab); card.appendChild(tg);
      grid.appendChild(card);
    });

    if (noteEl) {
      var when = "";
      if (data.generated_at) { var d = new Date(data.generated_at); if (!isNaN(d.getTime())) when = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
      noteEl.textContent = "Public-safe aggregate projection from GridFleet's own proof layer" + (when ? " · latest verified snapshot " + when : "") + ". “Live” = a freshness-confirmed feed; “verified” = the latest verified snapshot; “estimated” figures are marked as such. No customer data, secrets, or private logs are published.";
    }
    band.removeAttribute("hidden");
    return true;
  }

  function reveal() {
    var cards = [].slice.call(grid.querySelectorAll(".pb-stat"));
    if (staticMode) { cards.forEach(function (c) { c.classList.add("in"); }); return; }
    var cardIo = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); cardIo.unobserve(e.target); } }); }, { threshold: 0.2 });
    cards.forEach(function (c) { cardIo.observe(c); });
    [].slice.call(grid.querySelectorAll("[data-pbcount]")).forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-pbcount")) || 0;
      var num = el.querySelector(".pb-num");
      var done = false;
      var vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !done) {
            done = true; var t0 = null;
            function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1300); num.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); else num.textContent = fmt(target); }
            requestAnimationFrame(step); vio.disconnect();
          }
        });
      }, { threshold: 0.6 });
      vio.observe(el);
    });
  }

  fetchSnap().then(function (data) { if (build(data)) reveal(); }).catch(function () { /* band stays hidden */ });
})();
