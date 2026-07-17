/* GridFleet — motion + interface orchestration.
   GSAP + ScrollTrigger + Lenis (self-hosted), no CDN. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) doc.classList.add("reduced");
  var FINE = window.matchMedia("(pointer: fine)").matches;
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);

  /* ---------------- shared data ---------------- */
  var EASE = "expo.out";

  var AGENTS = [
    { title: "Communications Operator", lane: "Comms & Routing", img: "/assets/agents/clu.jpg" },
    { title: "Creative Director", lane: "Brand & Content", img: "/assets/agents/lora.jpg" },
    { title: "Bilingual Receptionist", lane: "Front Desk / Voice", img: "/assets/agents/paloma.jpg" },
    { title: "Event & Wedding Planner", lane: "Scheduling & Events", img: "/assets/agents/maddie.jpg" },
    { title: "Security Chief", lane: "Defense & Policy", img: "/assets/agents/tron.jpg" },
    { title: "Finance Operator", lane: "Ledgers & Spend", img: "/assets/agents/ram.jpg" },
    { title: "Grid Doctor", lane: "Health & SLOs", img: "/assets/agents/beck.jpg" },
    { title: "Infrastructure Operator", lane: "Supply Chain & Infra", img: "/assets/agents/dumont.jpg" },
    { title: "Release Engineer", lane: "Build & Deploy", img: "/assets/agents/echo.jpg" },
    { title: "Safety Auditor", lane: "Alignment & Review", img: "/assets/agents/quorra.jpg" },
    { title: "Growth & Social", lane: "Distribution", img: "/assets/agents/yori.jpg" },
    { title: "Red Team", lane: "Adversarial Testing", img: "/assets/agents/ares.jpg" },
    { title: "Comms Engineer", lane: "Protocols & Comms", img: "/assets/agents/tesler.jpg" },
    { title: "Markets Desk", lane: "Signals & Research", img: "/assets/agents/neon-dave.jpg" },
    { title: "Public Red-Team", lane: "External Hardening", img: "/assets/agents/sark.jpg" },
    { title: "Operations PM", lane: "Coordination", img: "/assets/agents/able.jpg" }
  ];
  var GLOWS = [
    "rgba(34,230,255,0.17)", "rgba(45,255,196,0.15)", "rgba(182,255,60,0.12)",
    "rgba(64,156,255,0.17)", "rgba(160,220,255,0.15)"
  ];
  var AVA_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0a0f16"/><circle cx="50" cy="38" r="16" fill="none" stroke="#22e6ff" stroke-width="1.4" opacity=".8"/><path d="M20 88 C24 64 40 58 50 58 C60 58 76 64 80 88" fill="none" stroke="#22e6ff" stroke-width="1.4" opacity=".8"/></svg>'
  );

  function hex(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += "0123456789abcdef"[(Math.random() * 16) | 0];
    return s;
  }

  /* ---------------- lenis + gsap wiring ---------------- */
  var lenis = null;
  if (HAS_GSAP) {
    doc.classList.add("anim");
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: EASE, duration: 1 });
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (!REDUCED && window.Lenis) {
      lenis = new Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  function scrollToEl(target) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(id);
  });

  /* ---------------- intro ---------------- */
  var intro = document.getElementById("intro");
  var heroPlayed = false;

  function playHero() {
    if (heroPlayed) return;
    heroPlayed = true;
    if (!HAS_GSAP || REDUCED) return;
    var tl = gsap.timeline();
    tl.to(".hero .line-inner", { y: 0, duration: 1.05, stagger: 0.09 }, 0.05)
      .fromTo(".hero .line-inner", { skewY: 2.4 }, { skewY: 0, duration: 1.05, stagger: 0.09 }, 0.05)
      .fromTo(".hero h1", { "--ab": 7 }, { "--ab": 0, duration: 1.15, ease: "power3.out" }, 0.22)
      .fromTo(".hero-eyebrow", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.2)
      .fromTo(".hero-sub", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.45)
      .fromTo(".hero-ctas .btn", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.6)
      .fromTo(".hero-foot", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 0.85)
      .fromTo(".hero-ledger", { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.9 }, 0.75);
  }

  function killIntro() {
    if (intro) intro.classList.add("gone");
    playHero();
  }

  if (!intro) { playHero(); }
  else if (REDUCED || !HAS_GSAP || sessionStorage.getItem("gf_intro")) {
    killIntro();
  } else {
    window.__gfIntroLive = true;
    sessionStorage.setItem("gf_intro", "1");
    document.body.style.overflow = "hidden";
    /* grid draws in from the horizon -> nodes ignite (bar) -> wordmark reveals ->
       first receipt stamps -> wipe up, UI settles. <=1.5s, skippable, once/session. */
    var itl = gsap.timeline({
      onComplete: function () { document.body.style.overflow = ""; killIntro(); }
    });
    itl.to("#intro .intro-horizon", { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, 0)
      .to("#intro .intro-floor", { opacity: 1, duration: 0.5, ease: "power2.out" }, 0.16)
      .to("#intro .intro-word span", { y: 0, opacity: 1, duration: 0.55, stagger: 0.04 }, 0.2)
      .to("#intro .intro-bar i", { scaleX: 1, duration: 0.68, ease: "power2.inOut" }, 0.26)
      .fromTo("#intro .intro-sub", { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.42)
      .to("#intro .intro-chip", { opacity: 1, scale: 1, duration: 0.26, ease: "back.out(2.4)" }, 0.78)
      .add(function () { playHero(); }, 1.0)
      .to("#intro", { clipPath: "inset(0 0 100% 0)", duration: 0.5, ease: "power3.inOut" }, 1.0);
    var skipIntro = function () {
      if (intro.classList.contains("gone")) return;
      document.body.style.overflow = "";
      itl.progress(1);
    };
    intro.addEventListener("click", skipIntro);
    var skipBtn = document.getElementById("intro-skip");
    if (skipBtn) skipBtn.addEventListener("click", skipIntro);
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") skipIntro(); });
  }

  /* ---------------- nav ---------------- */
  var nav = document.getElementById("nav");
  var lastY = 0;
  function onScrollNav(y) {
    if (!nav) return;
    nav.classList.toggle("scrolled", y > 80);
    if (y > 140 && y > lastY + 4 && !document.body.classList.contains("menu-open")) nav.classList.add("hidden");
    else if (y < lastY - 4 || y <= 140) nav.classList.remove("hidden");
    lastY = y;
  }
  if (HAS_GSAP) {
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: function () { onScrollNav(window.scrollY); } });
  } else {
    window.addEventListener("scroll", function () { onScrollNav(window.scrollY); }, { passive: true });
  }

  /* ---------------- overlay menu ---------------- */
  var menu = document.getElementById("menu");
  var burger = document.getElementById("burger");
  var menuOpen = false, menuTl = null;

  function buildMenuTl() {
    if (!HAS_GSAP) return null;
    var tl = gsap.timeline({ paused: true });
    tl.set(menu, { visibility: "visible" })
      .fromTo(menu, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.7, ease: "power3.inOut" })
      .fromTo("#menu .menu-main a", { y: 44, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06 }, 0.25)
      .fromTo("#menu .menu-side a, #menu .menu-foot", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.04 }, 0.4);
    return tl;
  }

  function openMenu() {
    if (menuOpen || !menu) return;
    menuOpen = true;
    document.body.classList.add("menu-open");
    if (burger) burger.setAttribute("aria-expanded", "true");
    if (lenis) lenis.stop();
    if (HAS_GSAP && !REDUCED) {
      if (!menuTl) menuTl = buildMenuTl();
      menuTl.timeScale(1).play(0);
    } else {
      menu.style.visibility = "visible";
      menu.style.clipPath = "inset(0)";
    }
  }
  function closeMenu() {
    if (!menuOpen || !menu) return;
    menuOpen = false;
    document.body.classList.remove("menu-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
    if (lenis) lenis.start();
    if (HAS_GSAP && !REDUCED && menuTl) {
      menuTl.timeScale(1.6).reverse();
    } else {
      menu.style.clipPath = "inset(0 0 100% 0)";
      menu.style.visibility = "hidden";
    }
  }
  if (burger) burger.addEventListener("click", function () { menuOpen ? closeMenu() : openMenu(); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* ---------------- progress rail (triggers created later, after the pin) ---------------- */
  var SCENES = ["#fleet", "#work", "#receipts", "#deck", "#deploy"];
  var railNodes = Array.prototype.slice.call(document.querySelectorAll("#rail .rail-node"));
  railNodes.forEach(function (n, i) {
    n.addEventListener("click", function () { scrollToEl(SCENES[i]); });
  });
  function initRail() {
    if (!HAS_GSAP) return;
    SCENES.forEach(function (sel, i) {
      var el = document.querySelector(sel);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: "top 55%", end: "bottom 55%", refreshPriority: -10,
        onToggle: function (self) { if (railNodes[i]) railNodes[i].classList.toggle("active", self.isActive); }
      });
    });
    var segs = document.querySelectorAll("#rail .rail-seg i");
    ScrollTrigger.create({
      start: 0, end: "max", refreshPriority: -10,
      onUpdate: function (self) {
        var p = self.progress * segs.length;
        segs.forEach(function (s, i) {
          var v = Math.max(0, Math.min(1, p - i));
          s.style.transform = "scaleY(" + v + ")";
        });
      }
    });
  }

  /* ---------------- hero ledger (receipt materialization) ---------------- */
  var ledger = document.getElementById("hero-ledger");
  var ledgerList = document.getElementById("hl-list");
  var RPOOL = [
    { role: "Security Chief", act: "rotated an exposed credential", cost: "$0.02 · 1.1s" },
    { role: "Markets Desk", act: "flagged a config-risk delta", cost: "$0.05 · 2.8s" },
    { role: "Grid Doctor", act: "verified 41 scheduled checks", cost: "$0.01 · 0.9s" },
    { role: "Release Engineer", act: "shipped a verified build", cost: "$0.04 · 3.1s" },
    { role: "Safety Auditor", act: "cleared an autonomy review", cost: "$0.02 · 1.6s" },
    { role: "Infrastructure Operator", act: "scanned supply-chain files", cost: "$0.03 · 2.2s" },
    { role: "Communications Operator", act: "triaged inbound routing", cost: "$0.01 · 0.7s" },
    { role: "Red Team", act: "closed an attack-surface probe", cost: "$0.03 · 2.4s" }
  ];
  var rpi = 0;

  function receiptChip(r) {
    var el = document.createElement("div");
    el.className = "receipt-chip";
    el.innerHTML =
      '<div class="rc-top"><span>' + r.role + '</span><span class="ok">&#10003;</span></div>' +
      '<div>' + r.act + '</div>' +
      '<div class="rc-top"><span>' + r.cost + '</span></div>' +
      '<div class="rc-hash">sha-256 · ' + hex(18) + '&hellip;</div>';
    return el;
  }

  function pushLedger(chip) {
    ledgerList.insertBefore(chip, ledgerList.firstChild);
    var extra = ledgerList.children.length - 3;
    for (var i = 0; i < extra; i++) {
      var old = ledgerList.lastElementChild;
      if (HAS_GSAP && !REDUCED) {
        gsap.to(old, {
          autoAlpha: 0, height: 0, marginTop: 0, duration: 0.4, ease: "power2.in",
          onComplete: function () { this.targets()[0].remove(); }
        });
      } else old.remove();
    }
  }

  window.addEventListener("gf:receipt", function (e) {
    if (!ledger || !ledgerList) return;
    var r = RPOOL[rpi++ % RPOOL.length];
    var chip = receiptChip(r);
    if (!HAS_GSAP || REDUCED) { pushLedger(chip); return; }

    chip.style.visibility = "hidden";
    pushLedger(chip);

    /* clone flies from the node flash to the ledger slot */
    var clone = chip.cloneNode(true);
    clone.style.visibility = "visible";
    clone.style.position = "fixed";
    clone.style.zIndex = "60";
    clone.style.width = "248px";
    clone.style.margin = "0";
    clone.style.left = "0"; clone.style.top = "0";
    document.body.appendChild(clone);

    var sx = e.detail.x, sy = e.detail.y;
    gsap.set(clone, { x: sx - 40, y: sy - 20, scale: 0.35, autoAlpha: 0, transformOrigin: "0 0" });
    var tl = gsap.timeline({
      onComplete: function () { chip.style.visibility = ""; clone.remove(); }
    });
    tl.to(clone, { autoAlpha: 1, scale: 0.62, duration: 0.28, ease: "power2.out" })
      .add(function () { }, "+=0.12")
      .to(clone, {
        x: function () { return chip.getBoundingClientRect().left; },
        y: function () { return chip.getBoundingClientRect().top; },
        scale: 1, duration: 0.85, ease: "expo.inOut"
      });
  });

  window.addEventListener("gf:static", function () {
    if (!ledgerList) return;
    pushLedger(receiptChip(RPOOL[1]));
    pushLedger(receiptChip(RPOOL[0]));
  });

  /* ---------------- scene 02 · console ---------------- */
  var consoleBody = document.getElementById("console-body");
  var LINES = [
    { pre: "$ ", preCls: "lm", text: "gridfleet job submit --lane monitoring", s: 0.00, e: 0.07, dot: false },
    { pre: "job  ", preCls: "cy", text: "watch one federal court docket for new filings", s: 0.075, e: 0.15, dot: false },
    { pre: "plan ", preCls: "cy", text: "3 steps compiled · policy lane: monitoring · scoped grant OK", s: 0.16, e: 0.24, dot: true },
    { pre: "▸ docket.query   ", preCls: "wh", text: "fetch docket index from the approved source", s: 0.25, e: 0.38, dot: true, chip: "1.9s · $0.03", indent: true },
    { pre: "▸ diff.compare   ", preCls: "wh", text: "compare against the last verified snapshot", s: 0.39, e: 0.51, dot: true, chip: "0.6s · $0.01", indent: true },
    { pre: "▸ evidence.pack  ", preCls: "wh", text: "capture excerpts + checksum the bundle", s: 0.52, e: 0.63, dot: true, chip: "1.1s · $0.02", indent: true },
    { pre: "result ", preCls: "lm", text: "2 new filings detected → summarized, deadline flagged", s: 0.64, e: 0.71, dot: true },
    { pre: "done ", preCls: "lm", text: "total 3.6s · $0.06 — printing receipt", s: 0.715, e: 0.76, dot: false }
  ];
  var STEPS_AT = [0.16, 0.25, 0.52, 0.77]; // plan / act / verify / receipt
  var lineEls = [];

  if (consoleBody) {
    LINES.forEach(function (L) {
      var row = document.createElement("div");
      row.className = "cline" + (L.indent ? " indent" : "");
      var html = "";
      if (L.dot) html += '<span class="dot"></span>';
      html += '<span class="ctext"><span class="' + L.preCls + ' cpre" style="opacity:0">' + L.pre + "</span><span class=\"typed\"></span><span class=\"caret\"></span></span>";
      if (L.chip) html += '<span class="chip">' + L.chip + "</span>";
      row.innerHTML = html;
      consoleBody.appendChild(row);
      lineEls.push({
        row: row,
        pre: row.querySelector(".cpre"),
        typed: row.querySelector(".typed"),
        dot: row.querySelector(".dot"),
        chip: row.querySelector(".chip")
      });
    });
  }

  var receiptEl = document.getElementById("work-receipt");
  var sealEl = receiptEl ? receiptEl.querySelector(".r-seal") : null;
  var ledgerLine = document.getElementById("console-ledgerline-b");
  var workSteps = Array.prototype.slice.call(document.querySelectorAll(".work-step"));
  var lastRender = -1;
  var printFired = false;

  function renderConsole(t) {
    if (!consoleBody) return;
    if (Math.abs(t - lastRender) < 0.0005) return;
    lastRender = t;
    LINES.forEach(function (L, i) {
      var el = lineEls[i];
      var local = (t - L.s) / (L.e - L.s);
      local = Math.max(0, Math.min(1, local));
      var on = local > 0;
      el.row.classList.toggle("vis", on);
      el.pre.style.opacity = on ? 1 : 0;
      var n = Math.round(local * L.text.length);
      var want = L.text.slice(0, n);
      if (el.typed.textContent !== want) el.typed.textContent = want;
      el.row.classList.toggle("typing", on && local < 1);
      if (el.dot) {
        el.dot.classList.toggle("run", on && local < 1);
        el.dot.classList.toggle("done", local >= 1);
      }
      if (el.chip) el.chip.classList.toggle("vis", local >= 1);
    });
    /* receipt print 0.76 -> 0.96 */
    if (t >= 0.78 && !printFired) { printFired = true; window.dispatchEvent(new CustomEvent("gf:print")); }
    if (t < 0.7) printFired = false;
    if (receiptEl) {
      var rp = Math.max(0, Math.min(1, (t - 0.76) / 0.20));
      receiptEl.style.clipPath = "inset(0 0 " + ((1 - rp) * 100) + "% 0)";
      if (sealEl) {
        var sp = Math.max(0, Math.min(1, (t - 0.90) / 0.06));
        sealEl.style.opacity = sp;
        sealEl.style.transform = "scale(" + (0.8 + 0.2 * sp) + ")";
      }
    }
    if (ledgerLine) {
      var lp = t > 0.965;
      ledgerLine.textContent = lp ? "receipt verified ✓ archived to ledger" : "awaiting receipt …";
      ledgerLine.classList.toggle("tag--lime", lp);
    }
    workSteps.forEach(function (s, i) {
      s.classList.toggle("on", t >= STEPS_AT[i]);
    });
  }
  renderConsole(0);

  if (HAS_GSAP && consoleBody) {
    var proxy = { p: 0 };
    var mm = gsap.matchMedia();
    mm.add("(min-width: 981px)", function () {
      if (REDUCED) { renderConsole(1); return; }
      var tw = gsap.to(proxy, {
        p: 1, ease: "none",
        scrollTrigger: {
          trigger: ".work-pin", start: "top top", end: "+=260%",
          pin: true, anticipatePin: 1, scrub: 0.5
        },
        onUpdate: function () { renderConsole(proxy.p); }
      });
      return function () { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); };
    });
    mm.add("(max-width: 980px)", function () {
      if (REDUCED) { renderConsole(1); return; }
      var st = ScrollTrigger.create({
        trigger: "#work", start: "top 62%", once: true,
        onEnter: function () {
          gsap.to(proxy, { p: 1, duration: 8.5, ease: "none", onUpdate: function () { renderConsole(proxy.p); } });
        }
      });
      return function () { st.kill(); };
    });
  } else {
    renderConsole(1);
  }

  /* rail triggers go in AFTER the pinned scene so its spacer is accounted for */
  initRail();

  /* ---------------- command deck ---------------- */
  var panel = document.getElementById("deck-panel");
  var glowEl = document.getElementById("deck-glow");
  var scanEl = document.getElementById("deck-scan");
  var ticksWrap = document.getElementById("deck-ticks");

  if (panel) {
    var faces = panel.querySelectorAll(".deck-face");
    var cur = 0, showing = 0; // face index
    var animating = false, cycles = 0, paused = false;
    var seed = window.GF_SEED || null;
    var timer = null;

    /* ticks */
    var ticks = [];
    if (ticksWrap) {
      AGENTS.forEach(function (_, i) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Show specialist " + (i + 1));
        b.addEventListener("click", function () { manualGo(i); });
        ticksWrap.appendChild(b);
        ticks.push(b);
      });
    }
    function setTicks(i) { ticks.forEach(function (t, j) { t.classList.toggle("on", j === i); }); }

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function fillFace(face, idx) {
      var a = AGENTS[idx];
      var src = (idx === 0 && seed) ? seed : a.img;
      face.innerHTML =
        '<div class="deck-ava" data-layer><img alt="' + a.title + ' — fleet specialist" src="' + src + '"></div>' +
        '<div class="deck-info">' +
        '<div class="deck-unit" data-layer><span>Unit ' + pad2(idx + 1) + " / 16</span><span class=\"du-r\">Command deck</span></div>" +
        '<h3 class="deck-title" data-layer>' + a.title + "</h3>" +
        '<div class="deck-meta">' +
        '<div class="dm-row" data-layer><span>Lane</span><span class="dm-v">' + a.lane + "</span></div>" +
        '<div class="dm-row" data-layer><span>Duty cycle</span><span class="dm-v">24 / 7</span></div>' +
        '<div class="dm-row dm-hide-m" data-layer><span>Receipts</span><span class="dm-v lm">Verified</span></div>' +
        "</div></div>";
      var img = face.querySelector("img");
      img.onerror = function () { this.onerror = null; this.src = AVA_FALLBACK; };
    }

    function preload(idx) { var im = new Image(); im.src = AGENTS[idx].img; }

    function flip(nextIdx, manual) {
      if (animating || nextIdx === cur) return;
      animating = true;
      cycles++;
      var outFace = faces[showing];
      var inFace = faces[1 - showing];
      fillFace(inFace, nextIdx);
      setTicks(nextIdx);
      preload((nextIdx + 1) % AGENTS.length);

      var glowCol = GLOWS[nextIdx % GLOWS.length];

      if (!HAS_GSAP || REDUCED) {
        inFace.classList.add("incoming");
        inFace.style.clipPath = "none";
        inFace.style.visibility = "visible";
        outFace.style.visibility = "hidden";
        outFace.classList.remove("incoming");
        if (glowEl) glowEl.style.setProperty("--deck-glow", glowCol);
        showing = 1 - showing;
        cur = nextIdx;
        animating = false;
        return;
      }

      var doGlitch = manual || (cycles % 5 === 0);
      var h = panel.offsetHeight;
      inFace.classList.add("incoming");
      gsap.set(inFace, { visibility: "visible", clipPath: "inset(0 0 100% 0)" });
      var inLayers = inFace.querySelectorAll("[data-layer]");
      var outLayers = outFace.querySelectorAll("[data-layer]");
      gsap.set(inLayers, { y: 14, autoAlpha: 0 });

      var tl = gsap.timeline({
        onComplete: function () {
          gsap.set(outFace, { visibility: "hidden" });
          outFace.classList.remove("incoming");
          panel.classList.remove("glitch");
          outFace.classList.remove("outgoing");
          showing = 1 - showing;
          cur = nextIdx;
          animating = false;
        }
      });

      if (doGlitch) {
        outFace.classList.add("outgoing");
        panel.classList.add("glitch");
        tl.add(function () { }, 0.2);
      }
      var t0 = doGlitch ? 0.16 : 0;

      /* old layers exit */
      tl.to(outLayers, { y: -8, autoAlpha: 0, duration: 0.25, ease: "power2.in", stagger: 0.03 }, t0);

      /* scanline-led clip wipe */
      var prog = { p: 0 };
      tl.set(scanEl, { opacity: 1, y: 0 }, t0 + 0.08)
        .to(prog, {
          p: 1, duration: 0.55, ease: "expo.out",
          onUpdate: function () {
            inFace.style.clipPath = "inset(0 0 " + ((1 - prog.p) * 100) + "% 0)";
            scanEl.style.transform = "translateY(" + prog.p * (h - 2) + "px)";
          }
        }, t0 + 0.08)
        .to(scanEl, { opacity: 0, duration: 0.18 }, t0 + 0.5);

      /* staggered element re-entry: avatar, unit, title, meta rows */
      tl.to(inLayers, { y: 0, autoAlpha: 1, duration: 0.5, ease: EASE, stagger: 0.06 }, t0 + 0.2);

      /* ambient hue bleed */
      if (glowEl) tl.to(glowEl, { "--deck-glow": glowCol, duration: 0.8, ease: "power2.out" }, t0);
    }

    function manualGo(i) {
      restartTimer();
      flip(((i % AGENTS.length) + AGENTS.length) % AGENTS.length, true);
    }

    function auto() { if (!paused && !document.hidden) flip((cur + 1) % AGENTS.length, false); }
    function restartTimer() {
      if (timer) clearInterval(timer);
      if (!REDUCED) timer = setInterval(auto, 4600);
    }

    /* init faces */
    fillFace(faces[0], 0);
    faces[0].style.visibility = "visible";
    faces[0].style.clipPath = "none";
    faces[1].style.visibility = "hidden";
    setTicks(0);
    preload(0); preload(1);

    var stage = document.getElementById("deck-stage");
    if (stage) {
      stage.addEventListener("mouseenter", function () { paused = true; });
      stage.addEventListener("mouseleave", function () { paused = false; });
      stage.addEventListener("focusin", function () { paused = true; });
      stage.addEventListener("focusout", function () { paused = false; });
      /* swipe */
      var tx = null;
      stage.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener("touchend", function (e) {
        if (tx === null) return;
        var dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 42) manualGo(cur + (dx < 0 ? 1 : -1));
        tx = null;
      }, { passive: true });
    }
    var prevB = document.getElementById("deck-prev");
    var nextB = document.getElementById("deck-next");
    if (prevB) prevB.addEventListener("click", function () { manualGo(cur - 1); });
    if (nextB) nextB.addEventListener("click", function () { manualGo(cur + 1); });

    restartTimer();
    /* pause auto-cycle offscreen */
    if (HAS_GSAP) {
      ScrollTrigger.create({
        trigger: "#deck", start: "top bottom", end: "bottom top",
        onToggle: function (self) {
          if (self.isActive) restartTimer();
          else if (timer) { clearInterval(timer); timer = null; }
        }
      });
    }
  }

  /* ---------------- reveals + counters ---------------- */
  if (HAS_GSAP && !REDUCED) {
    gsap.utils.toArray(".fade-up").forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.05, ease: EASE,
        delay: parseFloat(el.getAttribute("data-delay") || 0),
        scrollTrigger: { trigger: el, start: "top 86%", once: true }
      });
    });
    gsap.utils.toArray(".scene .line-mask").forEach(function (mask) {
      if (mask.closest(".hero")) return;
      gsap.to(mask.querySelector(".line-inner"), {
        y: 0, duration: 1.0, ease: EASE,
        scrollTrigger: { trigger: mask, start: "top 85%", once: true }
      });
    });
  } else {
    document.querySelectorAll(".fade-up").forEach(function (el) { el.style.opacity = 1; el.style.transform = "none"; });
    document.querySelectorAll(".line-mask .line-inner").forEach(function (el) { el.style.transform = "none"; });
  }

  function fmt(n, dec) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: dec || 0 }); }
  var counters = document.querySelectorAll("[data-count]");
  counters.forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var final = fmt(target) + suffix;
    if (!HAS_GSAP || REDUCED) { el.childNodes[0].nodeValue = fmt(target); return; }
    var o = { v: 0 };
    gsap.to(o, {
      v: target, duration: Math.min(2, 1.2 + target / 40000), ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 78%", once: true },
      onUpdate: function () { el.childNodes[0].nodeValue = fmt(Math.round(o.v)); }
    });
  });

  /* refresh live metrics from the public snapshot if reachable */
  fetch("/data/public-grid-metrics.snapshot.json").then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.metrics) return;
    var generated = j.generated_at ? new Date(j.generated_at) : null;
    j.metrics.forEach(function (m) {
      var el = document.querySelector('[data-metric="' + m.metric_id + '"]');
      if (!el || m.current_value === null || m.current_value === undefined) return;
      el.childNodes[0].nodeValue = fmt(m.current_value);
      el.setAttribute("data-count", m.current_value);
      var cell = el.closest(".proof-cell");
      var fresh = cell ? cell.querySelector(".pc-fresh") : null;
      if (fresh) {
        fresh.textContent = m.status === "ok" ? "measured · fresh" : "verified snapshot";
        fresh.classList.toggle("live", m.status === "ok");
      }
    });
    var stamp = document.querySelector("[data-proof-generated]");
    if (stamp && generated && !isNaN(generated.getTime())) stamp.textContent = "snapshot " + generated.toLocaleString();
  }).catch(function () { });

  /* ---------------- magnetic buttons ---------------- */
  if (HAS_GSAP && FINE && !REDUCED) {
    document.querySelectorAll(".btn, .deck-arrows button").forEach(function (b) {
      var qx = gsap.quickTo(b, "x", { duration: 0.4, ease: "power3.out" });
      var qy = gsap.quickTo(b, "y", { duration: 0.4, ease: "power3.out" });
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.22);
        qy((e.clientY - r.top - r.height / 2) * 0.3);
      });
      b.addEventListener("mouseleave", function () { qx(0); qy(0); });
    });
  }

  /* ---------------- early-access form ---------------- */
  var ENDPOINT = "/api/early-access";
  function setStatus(form, ok, text) {
    var el = form.querySelector(".form-status");
    if (!el) return;
    el.style.display = "block";
    el.style.color = ok ? "#b6ff3c" : "#ff8f8f";
    el.textContent = text;
  }
  document.querySelectorAll("form[data-early-access]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      if (!window.fetch) return;
      ev.preventDefault();
      var get = function (n) { var f = form.querySelector('[name="' + n + '"]'); return f ? f.value.trim() : ""; };
      var parts = [];
      if (get("message")) parts.push(get("message"));
      /* company/plan/phone travel as structured fields; volume/risk still fold into message */
      ["volume", "risk"].forEach(function (x) { if (get(x)) parts.push(x + ": " + get(x)); });
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: get("email"), name: get("name"),
          company: get("company"), plan: get("plan"), phone: get("phone"),
          message: parts.join("\n"),
          website: form.querySelector('[name="website"]') ? form.querySelector('[name="website"]').value : ""
        })
      }).then(function (res) {
        return res.json().then(function (j) { return { status: res.status, body: j }; });
      }).then(function (r) {
        if (r.status === 200 && r.body && r.body.ok) {
          setStatus(form, true, "Request received — we will be in touch.");
          form.reset();
        } else {
          var d = r.body && r.body.error ? " (" + r.body.error + ")" : "";
          setStatus(form, false, "Something went wrong" + d + ". Please retry or email sales@gridfleet.ai.");
        }
      }).catch(function () {
        setStatus(form, false, "Network error. Please retry or email sales@gridfleet.ai.");
      }).finally(function () { if (btn) btn.disabled = false; });
    });
  });

  /* ============================================================
     AWARD LAYER — sound · cursor · portal · scroll film · transitions
     ============================================================ */

  /* ---------- A) sound design — WebAudio synth, OFF by default, gesture-gated ---------- */
  var gfAudio = (function () {
    var noop = { enabled: false, tick: function () { }, stamp: function () { } };
    if (REDUCED || !(window.AudioContext || window.webkitAudioContext)) return noop;

    var ctx = null, master = null, humGain = null, noiseBuf = null;
    var enabled = false, lastTick = 0, humFactor = 1;

    function ensureCtx() {
      if (ctx) return true;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.85;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { return false; }
      return true;
    }

    /* quiet ambient hum — only where the grid hero lives */
    function startHum() {
      if (humGain || !document.getElementById("fleet-canvas")) return;
      humGain = ctx.createGain();
      humGain.gain.value = 0;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 170; lp.Q.value = 0.6;
      lp.connect(humGain); humGain.connect(master);
      [[52, 0.5, "sine"], [52.35, 0.38, "sine"], [104.2, 0.1, "triangle"]].forEach(function (o) {
        var osc = ctx.createOscillator();
        osc.type = o[2]; osc.frequency.value = o[0];
        var g = ctx.createGain(); g.gain.value = o[1];
        osc.connect(g); g.connect(lp); osc.start();
      });
      var nz = ctx.createBufferSource();
      nz.buffer = noiseBuf; nz.loop = true;
      var ng = ctx.createGain(); ng.gain.value = 0.045;
      nz.connect(ng); ng.connect(lp); nz.start();
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.07; lg.gain.value = 26;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    }
    function setHum() {
      if (!humGain) return;
      var v = enabled ? 0.05 * humFactor : 0;
      humGain.gain.setTargetAtTime(v, ctx.currentTime, 0.5);
    }
    /* hum recedes as the hero scrolls away */
    window.addEventListener("scroll", function () {
      if (!enabled || !humGain) return;
      var f = 1 - Math.min(1, window.scrollY / (window.innerHeight * 1.2));
      humFactor = 0.18 + 0.82 * f;
      setHum();
    }, { passive: true });

    function blip(freq, gain, dur, type, sweepTo) {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    }
    function noiseBurst(gain, dur, freq) {
      if (!enabled || !ctx) return;
      var t = ctx.currentTime;
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = freq || 900;
      var g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.03);
    }

    var api = {
      get enabled() { return enabled; },
      tick: function () {
        var now = performance.now();
        if (now - lastTick < 80) return;
        lastTick = now;
        blip(1860, 0.035, 0.045, "sine");
      },
      stamp: function (soft) {
        blip(soft ? 240 : 175, soft ? 0.07 : 0.16, 0.14, "sine", soft ? 110 : 58);
        noiseBurst(soft ? 0.03 : 0.07, 0.07, 1100);
      },
      set: function (on) {
        if (on && !ensureCtx()) return;
        enabled = on;
        if (on) {
          if (ctx.state === "suspended") ctx.resume();
          startHum();
          setHum();
          api.stamp(true);
          try { sessionStorage.setItem("gf_sound", "1"); } catch (e) { }
        } else {
          if (humGain) humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
          try { sessionStorage.removeItem("gf_sound"); } catch (e) { }
          setTimeout(function () { if (!enabled && ctx && ctx.state === "running") ctx.suspend(); }, 500);
        }
      }
    };
    return api;
  })();

  /* sound toggle UI — never autoplays; audio starts only from this user gesture */
  if (!REDUCED && gfAudio.set) {
    var sBtn = document.createElement("button");
    sBtn.id = "gf-sound";
    sBtn.type = "button";
    sBtn.setAttribute("aria-pressed", "false");
    sBtn.setAttribute("aria-label", "Sound: ambient hum and interface effects");
    sBtn.innerHTML = "<i></i><i></i><i></i>";
    document.body.appendChild(sBtn);
    var syncSound = function (on) {
      sBtn.classList.toggle("on", on);
      sBtn.setAttribute("aria-pressed", on ? "true" : "false");
    };
    sBtn.addEventListener("click", function () {
      var next = !gfAudio.enabled;
      gfAudio.set(next);
      syncSound(gfAudio.enabled);
    });
    /* same-session continuity: re-arm on first gesture, still user-initiated */
    var pref = null;
    try { pref = sessionStorage.getItem("gf_sound"); } catch (e) { }
    if (pref === "1") {
      var arm = function () {
        gfAudio.set(true);
        syncSound(gfAudio.enabled);
        window.removeEventListener("pointerdown", arm);
        window.removeEventListener("keydown", arm);
      };
      window.addEventListener("pointerdown", arm, { once: true });
      window.addEventListener("keydown", arm, { once: true });
    }
    window.addEventListener("gf:receipt", function () { gfAudio.stamp(true); });
    window.addEventListener("gf:print", function () { gfAudio.stamp(false); });
    window.addEventListener("gf:dock", function () { gfAudio.stamp(true); });
  }

  /* ---------- B) custom cursor — Tron reticle, pointer:fine only ---------- */
  if (FINE && !REDUCED && HAS_GSAP && window.matchMedia("(hover: hover)").matches) {
    var ringWrap = document.createElement("div");
    ringWrap.id = "gf-cursor-ring";
    ringWrap.setAttribute("aria-hidden", "true");
    ringWrap.innerHTML = '<div class="c-ring"><span class="c-label"></span></div>';
    var dotWrap = document.createElement("div");
    dotWrap.id = "gf-cursor-dot";
    dotWrap.setAttribute("aria-hidden", "true");
    dotWrap.innerHTML = '<div class="c-dot"></div>';
    document.body.appendChild(ringWrap);
    document.body.appendChild(dotWrap);
    doc.classList.add("gf-cur");

    var labelEl = ringWrap.querySelector(".c-label");
    var dotX = gsap.quickTo(dotWrap, "x", { duration: 0.12, ease: "power3.out" });
    var dotY = gsap.quickTo(dotWrap, "y", { duration: 0.12, ease: "power3.out" });
    var ringX = gsap.quickTo(ringWrap, "x", { duration: 0.42, ease: "power3.out" });
    var ringY = gsap.quickTo(ringWrap, "y", { duration: 0.42, ease: "power3.out" });
    var curShown = false, curState = "";

    function setCurState(s, label) {
      if (s === curState && (label === undefined || label === labelEl.textContent)) return;
      curState = s;
      ringWrap.classList.remove("is-link", "is-cta", "is-field", "is-text");
      dotWrap.classList.remove("is-text");
      if (s) ringWrap.classList.add(s);
      if (s === "is-text") dotWrap.classList.add("is-text");
      if (label !== undefined) labelEl.textContent = label;
    }

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (!curShown) { curShown = true; doc.classList.add("gf-cur-on"); }
      dotX(e.clientX); dotY(e.clientY);
      ringX(e.clientX); ringY(e.clientY);
    }, { passive: true });

    document.addEventListener("pointerover", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("input, textarea, select")) { setCurState("is-text", ""); return; }
      var i = t.closest("a, button, summary, [data-cursor]");
      if (i) {
        var label = i.getAttribute("data-cursor-label");
        if (label === null) {
          if (i.classList.contains("btn--solid") || i.classList.contains("btn--lime")) label = "deploy";
          else if (i.tagName === "A" || i.classList.contains("btn")) label = "→";
          else label = "";
        }
        setCurState(label.length > 1 ? "is-cta" : (label ? "is-link" : "is-link"), label);
        gfAudio.tick();
        return;
      }
      if (t.closest(".hero, .grid-field")) { setCurState("is-field", ""); return; }
      setCurState("", "");
    }, { passive: true });

    document.addEventListener("pointerdown", function () { ringWrap.classList.add("is-down"); }, { passive: true });
    document.addEventListener("pointerup", function () { ringWrap.classList.remove("is-down"); }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { doc.classList.remove("gf-cur-on"); curShown = false; });
  }

  /* ---------- C) headline chromatic pulse on hover ---------- */
  var heroH1 = document.querySelector(".hero h1");
  if (heroH1 && HAS_GSAP && !REDUCED && FINE) {
    var abBusy = false;
    heroH1.addEventListener("pointerenter", function () {
      if (abBusy) return;
      abBusy = true;
      gsap.fromTo(heroH1, { "--ab": 3.4 }, {
        "--ab": 0, duration: 0.55, ease: "power2.out",
        onComplete: function () { abBusy = false; }
      });
    });
  }

  /* ---------- D) continuous scroll film — hero exit + portal receipt + scene beats ---------- */
  if (HAS_GSAP && !REDUCED && document.getElementById("fleet-canvas")) {
    /* beat 1 — hero recedes as one continuous shot */
    gsap.to(".hero-inner", {
      yPercent: -12, autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: 0.4 }
    });
    gsap.to(".hero-foot", {
      autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "28% top", scrub: 0.4 }
    });
    gsap.to(".hero-ledger", {
      autoAlpha: 0, y: -46, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "5% top", end: "52% top", scrub: 0.4 }
    });

    var mmFilm = gsap.matchMedia();

    /* beat 2 — portal: a receipt lifts off the hero ledger and docks into the console ledger line */
    mmFilm.add("(min-width: 1101px) and (min-height: 701px)", function () {
      var hl = document.getElementById("hero-ledger");
      var dock = document.querySelector("#work .console-ledgerline");
      if (!hl || !dock) return;
      var portal = document.createElement("div");
      portal.id = "gf-portal";
      portal.setAttribute("aria-hidden", "true");
      portal.appendChild(receiptChip(RPOOL[2]));
      document.body.appendChild(portal);
      var easeFly = gsap.parseEase("power2.inOut");
      var stamped = false;
      var st = ScrollTrigger.create({
        trigger: "#work", start: "top 98%", end: "top top", scrub: 0.35,
        onUpdate: function (self) {
          var p = self.progress;
          if (p <= 0.002 || p >= 0.998) {
            portal.style.visibility = "hidden";
            portal.style.opacity = "0";
            if (p >= 0.998 && !stamped) {
              stamped = true;
              dock.classList.remove("gf-arrive");
              void dock.offsetWidth;
              dock.classList.add("gf-arrive");
              window.dispatchEvent(new CustomEvent("gf:dock"));
            }
            if (p <= 0.002) stamped = false;
            return;
          }
          if (p < 0.9) stamped = false;
          var from = hl.getBoundingClientRect();
          var to = dock.getBoundingClientRect();
          var e = easeFly(p);
          var x = from.left + (to.left + 16 - from.left) * e;
          var y = from.top + (to.top + to.height / 2 - 30 - from.top) * e - Math.sin(p * Math.PI) * 46;
          var s = 1 - 0.7 * easeFly(Math.max(0, (p - 0.45) / 0.55));
          var rot = Math.sin(p * Math.PI) * 2.6;
          var o = Math.min(1, p / 0.07) * (1 - Math.max(0, Math.min(1, (p - 0.84) / 0.14)));
          portal.style.visibility = "visible";
          portal.style.opacity = o;
          portal.style.transform = "translate3d(" + x + "px," + y + "px,0) rotate(" + rot + "deg) scale(" + s + ")";
        }
      });
      return function () { st.kill(); portal.remove(); };
    });

    /* beats 4-5 — scenes arrive scrubbed, not stacked (beat 3 is the existing console pin) */
    mmFilm.add("(min-width: 981px)", function () {
      var beats = [];
      if (document.querySelector("#receipts .anatomy .receipt")) {
        beats.push(gsap.fromTo("#receipts .anatomy .receipt",
          { rotation: -7, y: 90 },
          {
            rotation: -1.2, y: 0, ease: "none",
            scrollTrigger: { trigger: "#receipts", start: "top 85%", end: "top 25%", scrub: 0.5 }
          }));
        beats.push(gsap.fromTo("#receipts .anatomy-notes", { y: 60 }, {
          y: 0, ease: "none",
          scrollTrigger: { trigger: "#receipts", start: "top 80%", end: "top 20%", scrub: 0.5 }
        }));
      }
      if (document.getElementById("deck-stage")) {
        beats.push(gsap.fromTo("#deck-stage", { y: 70, scale: 0.965 }, {
          y: 0, scale: 1, ease: "none",
          scrollTrigger: { trigger: "#deck", start: "top 88%", end: "top 32%", scrub: 0.5 }
        }));
      }
      return function () {
        beats.forEach(function (b) { b.scrollTrigger && b.scrollTrigger.kill(); b.kill(); });
      };
    });
  }

  /* ---------- E) page transitions — View Transitions API + wipe fallback ---------- */
  (function pageTransitions() {
    if (REDUCED) return;                       /* reduced motion: instant navigation */
    if ("onpagereveal" in window) return;      /* cross-document View Transitions: CSS handles it */
    if (!HAS_GSAP) return;
    var wipe = document.createElement("div");
    wipe.id = "gf-wipe";
    wipe.setAttribute("aria-hidden", "true");
    document.body.appendChild(wipe);
    var leaving = false;
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin) return;
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      if (u.pathname === location.pathname && u.hash) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      if (lenis) lenis.stop();
      gsap.set(wipe, { visibility: "visible" });
      gsap.fromTo(wipe, { yPercent: 103, y: 0 }, {
        yPercent: 0, y: 0, duration: 0.42, ease: "power3.inOut",
        onComplete: function () { location.href = u.href; }
      });
      /* never trap: if navigation stalls, uncover */
      setTimeout(function () {
        if (!leaving) return;
        leaving = false;
        gsap.set(wipe, { clearProps: "all" });
        if (lenis) lenis.start();
      }, 1600);
    });
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) {
        leaving = false;
        gsap.set(wipe, { clearProps: "all" });
        if (lenis) lenis.start();
      }
    });
  })();

  /* year */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
})();
