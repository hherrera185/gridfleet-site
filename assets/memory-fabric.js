(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  root.classList.remove("no-js");
  var orbitStage = doc.querySelector(".mf-orbit-stage");

  function all(selector, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(selector));
  }

  function one(selector, scope) {
    return (scope || doc).querySelector(selector);
  }

  function textFor(selector, value) {
    all(selector).forEach(function (node) { node.textContent = value; });
  }

  function validNumber(value) {
    return typeof value === "number" && isFinite(value) && value >= 0;
  }

  function pair(part, total) {
    return validNumber(part) && validNumber(total) ? part.toLocaleString("en-US") + " / " + total.toLocaleString("en-US") : null;
  }

  function pct(value) {
    return validNumber(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) + "%" : null;
  }

  function millis(value) {
    return validNumber(value) ? value.toLocaleString("en-US", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " ms" : null;
  }

  function count(value) {
    return validNumber(value) ? value.toLocaleString("en-US") : null;
  }

  function stamp(value, prefix) {
    var date = new Date(value);
    if (!value || !isFinite(date.getTime())) return "Receipt unavailable";
    return (prefix || "Qualified") + " " + new Intl.DateTimeFormat("en-US", {
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC", timeZoneName: "short"
    }).format(date);
  }

  /* ---- public proof: every figure carries its own truth state ---- */

  var PROJECTION_MAX_AGE_MS = 3 * 60 * 60 * 1000;
  var SOURCE_LABELS = {
    nativeAudit: "native index audit",
    cortexCompilation: "cortex compilation",
    routeGuard: "fleet route guard",
    deterministic: "deterministic qualification",
    realCorpus: "real-corpus qualification",
    fabricHealth: "fabric health"
  };
  var UNAVAILABLE = "\u2014";

  function contractIsValid(data) {
    if (!data || data.schema !== "gridfleet.memory-fabric-public.v2" || data.privacy !== "aggregate-only" || data.actionAuthority !== false) return false;
    if (["nominal", "attention", "unavailable"].indexOf(data.status) < 0) return false;
    if (!data.product || data.product.name !== "GridFleet Memory Fabric" || !Array.isArray(data.product.architecture)) return false;
    if (!data.sources || !data.fleet || !data.fleet.lanes || !data.fleet.nativeIndex || !data.compilation || !data.qualification || !data.qualification.deterministic || !data.qualification.realCorpus) return false;
    return true;
  }

  /* Source state: fresh | stale | failing | unavailable. Stale and failing keep their
     numbers on screen with amber/rose treatment; only unavailable withholds. */
  function sourceState(source) {
    if (!source || source.ok === null || typeof source.generatedAt !== "string") return "unavailable";
    if (source.ok === false) return "failing";
    return source.freshness === "fresh" ? "fresh" : "stale";
  }

  function worst(states) {
    var order = ["fresh", "stale", "failing", "unavailable"];
    return states.reduce(function (acc, state) { return order.indexOf(state) > order.indexOf(acc) ? state : acc; }, "fresh");
  }

  var CAPTION_FALLBACK = { "runtime-caption": "All", "identity-caption": "their", "native-caption": "the service lanes", "mobile-coverage": "Unverified" };
  var QUALITY = { fresh: "current", stale: "stale", failing: "red", unavailable: "withheld" };
  function setMetric(name, value, state, stampText) {
    all('[data-memory-value="' + name + '"]').forEach(function (node) {
      var missing = value === null || value === undefined;
      var shown = missing ? (CAPTION_FALLBACK[name] || UNAVAILABLE) : value;
      node.textContent = shown;
      node.setAttribute("data-metric-state", missing ? "unavailable" : state);
      node.setAttribute("data-memory-quality", name === "authority" || name === "proof-authority" ? "invariant" : QUALITY[missing ? "unavailable" : state]);
      var card = node.closest("[data-proof], .mf-hero-metric, article, .mf-proof-lanes > div");
      if (card) card.setAttribute("data-metric-state", missing ? "unavailable" : state);
      var note = card && !card.querySelector("time") && card.querySelector("summary small, small");
      if (note && !note.hasAttribute("data-memory-note")) {
        var base = note.getAttribute("data-note-base") || note.textContent; note.setAttribute("data-note-base", base);
        var w = missing ? "NO RECEIPT" : stateWord(state);
        note.textContent = base;
        if (w) { var tag = doc.createElement("b"); tag.className = "mf-note-state"; tag.textContent = " · " + w.toLowerCase(); note.appendChild(tag); }
      }
    });
    if (stampText !== undefined) textFor('[data-memory-stamp="' + name + '"]', stampText);
  }

  function stateWord(state) {
    return state === "fresh" ? "" : state === "stale" ? "STALE RECEIPT" : state === "failing" ? "FAILING CHECK" : "NO RECEIPT";
  }

  function setStatus(state, headline, detail) {
    body.setAttribute("data-proof-state", state);
    var bar = one("[data-memory-status]");
    if (bar) {
      bar.setAttribute("data-state", state);
      var strong = one("strong", bar);
      var spans = all("span", bar);
      if (strong) strong.textContent = headline;
      if (spans.length > 1) spans[spans.length - 1].textContent = detail;
    }
    textFor("[data-memory-state]", state === "nominal" ? "NOMINAL" : state === "attention" ? "ATTENTION" : "UNAVAILABLE");
    textFor("[data-memory-status-label]", state === "nominal" ? "PROOF / NOMINAL" : state === "attention" ? "PROOF / ATTENTION" : "PROOF / UNAVAILABLE");
  }

  function renderAuthorityInvariant() {
    /* Action authority is an architectural invariant, not a measurement; it never degrades. */
    setMetric("authority", "NONE", "fresh");
    setMetric("proof-authority", "NONE", "fresh");
  }

  function renderUnavailable(reason) {
    all("[data-memory-value]").forEach(function (node) {
      var name = node.getAttribute("data-memory-value");
      node.textContent = CAPTION_FALLBACK[name] || UNAVAILABLE;
      node.setAttribute("data-metric-state", "unavailable");
      node.setAttribute("data-memory-quality", "withheld");
    });
    if (orbitStage) {
      orbitStage.classList.add("is-unverified");
      var dormant = one("[data-orbit]", orbitStage);
      if (dormant && !dormant.querySelector("button")) {
        dormant.setAttribute("aria-label", "Runtime-memory coverage unavailable");
        dormant.textContent = "";
        var empty = doc.createElement("span");
        empty.className = "mf-orbit-empty";
        empty.setAttribute("aria-hidden", "true");
        empty.textContent = "COVERAGE WITHHELD";
        dormant.appendChild(empty);
      }
    }
    all("[data-proof], .mf-hero-metric, .home-memory-proof article").forEach(function (node) { node.setAttribute("data-metric-state", "unavailable"); });
    renderAuthorityInvariant();
    setStatus("unavailable", "Live Memory Fabric proof is temporarily unavailable.", reason || "No cached result is presented as current. Memory authority remains false by architecture.");
    textFor("[data-memory-generated]", "Aggregate receipt unavailable. No cached value is shown.");
    all("[data-memory-time]").forEach(function (node) { node.textContent = "Receipt unavailable"; });
    textFor("[data-segment-readout]", "Aggregate coverage unavailable");
  }

  function renderProof(data) {
    if (!contractIsValid(data)) {
      renderUnavailable("The public projection failed its contract check. Nothing is shown as current.");
      return;
    }
    if (data.status === "unavailable" && Object.keys(data.sources).every(function (key) { return sourceState(data.sources[key]) === "unavailable"; })) {
      renderUnavailable();
      return;
    }

    var s = {};
    Object.keys(SOURCE_LABELS).forEach(function (key) { s[key] = sourceState(data.sources[key]); });
    var ageMs = Date.now() - new Date(data.generatedAt).getTime();
    var aged = !isFinite(ageMs) || ageMs > PROJECTION_MAX_AGE_MS;
    if (aged) Object.keys(s).forEach(function (key) { if (s[key] === "fresh") s[key] = "stale"; });

    var fleet = data.fleet;
    var det = data.qualification.deterministic;
    var real = data.qualification.realCorpus;
    var native = fleet.nativeIndex;

    var fleetState = worst([s.routeGuard, s.nativeAudit, s.cortexCompilation]);
    if (fleetState === "fresh" && validNumber(fleet.governedReady) && fleet.governedReady !== fleet.governedRuntimes) fleetState = "failing";
    var nativeState = s.nativeAudit;
    if (nativeState === "fresh" && (native.ready !== native.indexed || native.sourceDrift !== 0)) nativeState = "failing";
    var detState = s.deterministic;
    if (detState === "fresh" && (det.ok !== true || det.passed !== det.probes)) detState = "failing";
    var realState = s.realCorpus;
    if (realState === "fresh" && (real.ok !== true || real.correct !== real.questions || real.grounded !== real.questions || real.fabricatedAbstained !== real.fabricatedPrompts)) realState = "failing";
    var compState = s.cortexCompilation;
    if (compState === "fresh" && data.compilation.ready !== data.compilation.logicalCortices) compState = "failing";

    var srcStamp = function (key, prefix) { return stamp(data.sources[key] && data.sources[key].generatedAt, prefix); };

    Object.keys(SOURCE_LABELS).forEach(function (key) {
      var word = stateWord(s[key]);
      all('[data-memory-time="' + key + '"]').forEach(function (node) {
        node.textContent = srcStamp(key);
      });
    setMetric("fleet", pct(fleet.coveragePct), fleetState);
    setMetric("contract", pair(det.passed, det.probes), detState);
    var correctGrounded = validNumber(real.correct) && validNumber(real.grounded) ? Math.min(real.correct, real.grounded) : null;
    setMetric("grounded", pair(correctGrounded, real.questions), realState);
    setMetric("runtime-caption", count(fleet.governedRuntimes), fleetState);
    setMetric("identity-caption", count(fleet.memoryIdentities), compState);
    setMetric("native-caption", count(native.indexed), nativeState);
    setMetric("mobile-coverage", pair(fleet.governedReady, fleet.governedRuntimes), fleetState);
    setMetric("proof-fleet", pair(fleet.governedReady, fleet.governedRuntimes), fleetState);
    var servicesState = worst([s.routeGuard, s.nativeAudit]);
    if (servicesState === "fresh" && fleet.lanes.services.ready !== fleet.lanes.services.total) servicesState = "failing";
    var profilesState = worst([s.routeGuard, s.cortexCompilation]);
    if (profilesState === "fresh" && fleet.lanes.profiles.ready !== fleet.lanes.profiles.total) profilesState = "failing";
    setMetric("proof-services", pair(fleet.lanes.services.ready, fleet.lanes.services.total), servicesState);
    setMetric("proof-profiles", pair(fleet.lanes.profiles.ready, fleet.lanes.profiles.total), profilesState);
    setMetric("proof-native", pair(native.ready, native.indexed), nativeState);
    setMetric("proof-contract", pair(det.passed, det.probes), detState);
    setMetric("proof-real", pair(correctGrounded, real.questions), realState);
    setMetric("proof-abstain", pair(real.fabricatedAbstained, real.fabricatedPrompts), realState);
    setMetric("proof-drift", validNumber(native.sourceDrift) ? count(native.sourceDrift) + " drifted" : null, nativeState);
    setMetric("proof-compilation", pair(data.compilation.ready, data.compilation.logicalCortices), compState);
    setMetric("proof-fixture-latency", millis(det.p95Ms), detState);
    setMetric("proof-real-latency", millis(real.p95Ms), realState);
    renderAuthorityInvariant();

    all("[data-memory-note]").forEach(function (node) {
      var base = node.getAttribute("data-note-base") || node.textContent;
      node.setAttribute("data-note-base", base);
      var key = node.getAttribute("data-memory-note");
      var st = key === "fleet" ? fleetState : key === "contract" ? detState : key === "grounded" ? realState : "fresh";
      var word = stateWord(st);
      node.textContent = base;
      if (word) { var tag = doc.createElement("b"); tag.className = "mf-note-state"; tag.textContent = " · " + word.toLowerCase(); node.appendChild(tag); }
    });

    });

    if (orbitStage) orbitStage.classList.toggle("is-unverified", fleetState !== "fresh");
    all("[data-memory-value]").forEach(function (node) {
      var card = node.closest("[data-proof], .mf-proof-lanes > div");
      var t = card && card.querySelector("time[data-memory-time]");
      if (!t) return;
      var existing = t.querySelector(".mf-state-word"); if (existing) existing.remove();
      var st = node.getAttribute("data-metric-state");
      var word = st === "unavailable" ? "NO RECEIPT" : stateWord(st);
      if (word) { var b = doc.createElement("b"); b.className = "mf-state-word"; b.setAttribute("data-state-word", st); b.textContent = word; t.appendChild(b); }
    });
    if (validNumber(fleet.governedRuntimes)) buildOrbit(fleet.governedRuntimes, fleetState);
    else textFor("[data-segment-readout]", "Aggregate coverage unavailable");

    var stale = Object.keys(s).filter(function (key) { return s[key] === "stale"; }).map(function (key) { return SOURCE_LABELS[key]; });
    var failing = Object.keys(s).filter(function (key) { return s[key] === "failing"; }).map(function (key) { return SOURCE_LABELS[key]; });
    var missing = Object.keys(s).filter(function (key) { return s[key] === "unavailable"; }).map(function (key) { return SOURCE_LABELS[key]; });
    var allFresh = !stale.length && !failing.length && !missing.length;
    var redCounts = fleetState === "failing" || nativeState === "failing" || detState === "failing" || realState === "failing" || compState === "failing";

    var generatedText = stamp(data.generatedAt, "Projection generated") + (aged ? " · projection older than 3 h" : "");
    textFor("[data-memory-generated]", generatedText);

    if (data.status === "nominal" && allFresh && !redCounts && !aged) {
      setStatus("nominal", "Live aggregate proof is nominal.", "Aggregate-only projection. No conversations, source text, or private identifiers are published.");
      return;
    }
    var parts = [];
    if (stale.length) parts.push("Stale receipt: " + stale.join(", ") + ".");
    if (failing.length) parts.push("Failing check: " + failing.join(", ") + ".");
    if (missing.length) parts.push("No receipt: " + missing.join(", ") + ".");
    if (aged) parts.push("The projection itself is older than three hours.");
    if (redCounts && !failing.length) parts.push("A count does not meet its full denominator.");
    parts.push("Every figure stays visible with its receipt time; stale or failing figures lose current treatment. Memory authority remains false by architecture.");
    setStatus(data.status === "unavailable" ? "unavailable" : "attention", data.status === "unavailable" ? "Part of the live proof is unavailable." : "Live proof is in an attention state.", parts.join(" "));
  }

  function loadProof() {
    fetch("/assets/memory-fabric.json", { cache: "no-store", credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("public proof unavailable");
        return response.json();
      })
      .then(renderProof)
      .catch(function () { renderUnavailable(); });
  }

  var trialCases = {
    current: {
      state: "CITED ANSWER",
      question: "\u201cWhat is the current launch-access policy?\u201d",
      path: [["CORTEX / DRAFT FOUND", "hit"], ["CANON / ACCEPTED", "hit"], ["LIVE / REVISION 03", "live"], ["ARCHIVE / CLOSED", ""]],
      answer: "Approved pilot teams may enter on October 14. The earlier invite-only-through-September draft is superseded.",
      decision: "CURRENT FACT PROMOTED", evidence: "Policy revision 03 / synthetic sample", authority: "FALSE", receipt: "MF-DEMO-001"
    },
    changed: {
      state: "SUPERSESSION SHOWN",
      question: "\u201cWhat changed in the launch-access policy?\u201d",
      path: [["CORTEX / EARLIER DRAFT", "hit"], ["CANON / REVISION 03", "hit"], ["LIVE / CURRENT", "live"], ["ARCHIVE / HISTORY OPENED", "hit"]],
      answer: "The earlier draft limited access through September. Revision 03 replaced it with approved pilot access beginning October 14.",
      decision: "HISTORY PRESERVED", evidence: "Revisions 02 + 03 / synthetic sample", authority: "FALSE", receipt: "MF-DEMO-002"
    },
    unknown: {
      state: "ABSTAINED",
      question: "\u201cWho approved project Cobalt Orchid?\u201d",
      path: [["CORTEX / NO MATCH", ""], ["CANON / NO MATCH", ""], ["LIVE / NO ADMISSIBLE SOURCE", ""], ["ARCHIVE / NO EVIDENCE", ""]],
      answer: "I don\u2019t have admissible evidence for that project.",
      decision: "EVIDENCE-FREE ABSTENTION", evidence: "None / synthetic probe", authority: "FALSE", receipt: "MF-DEMO-003"
    },
    authority: {
      state: "ACTION BLOCKED",
      question: "\u201cCan you invite the approved pilot teams now?\u201d",
      path: [["MEMORY / POLICY KNOWN", "hit"], ["EVIDENCE / CITED", "hit"], ["AUTHORITY / CHECKED", "live"], ["ACTION GATE / CLOSED", ""]],
      answer: "No. Remembered context does not grant permission to send invitations. A separate scoped approval is required.",
      decision: "KNOWLEDGE IS NOT PERMISSION", evidence: "Policy revision 03 / synthetic sample", authority: "FALSE", receipt: "MF-DEMO-004"
    }
  };

  function renderTrial(name) {
    var item = trialCases[name];
    if (!item) return;
    textFor("[data-trial-state]", item.state);
    textFor("[data-trial-question]", item.question);
    textFor("[data-trial-answer]", item.answer);
    textFor("[data-trial-decision]", item.decision);
    textFor("[data-trial-evidence]", item.evidence);
    textFor("[data-trial-authority]", item.authority);
    textFor("[data-trial-receipt]", item.receipt);
    var pathNode = one("[data-trial-path]");
    if (pathNode) {
      pathNode.textContent = "";
      item.path.forEach(function (entry) {
        var span = doc.createElement("span");
        span.textContent = entry[0];
        if (entry[1]) span.className = entry[1];
        pathNode.appendChild(span);
      });
    }
  }

  var trialButtons = all("[data-trial]");
  trialButtons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      trialButtons.forEach(function (node) { node.setAttribute("aria-selected", node === button ? "true" : "false"); });
      renderTrial(button.getAttribute("data-trial"));
      one("#trial-panel").focus({ preventScroll: true });
    });
    button.addEventListener("keydown", function (event) {
      var direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      trialButtons[(index + direction + trialButtons.length) % trialButtons.length].focus();
    });
  });

  function bindSegments(segmentButtons) {
    segmentButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        segmentButtons.forEach(function (node) { node.classList.toggle("is-active", node === button); });
        textFor("[data-segment-readout]", "Runtime lane " + button.getAttribute("data-memory-segment") + " / private context isolated");
      });
    });
  }

  function buildOrbit(count, state) {
    var orbit = one("[data-orbit]");
    if (!orbit || !Number.isInteger(count) || count < 1 || count > 72) return;
    orbit.textContent = "";
    orbit.setAttribute("data-metric-state", state || "fresh");
    orbit.setAttribute("aria-label", count + " anonymous governed runtime-memory lanes around governed canon");
    var buttons = [];
    for (var index = 0; index < count; index += 1) {
      var label = String(index + 1).padStart(2, "0");
      var button = doc.createElement("button");
      button.type = "button";
      button.style.setProperty("--angle", (index * (360 / count)) + "deg");
      button.setAttribute("data-memory-segment", label);
      button.setAttribute("aria-label", "Runtime memory lane " + label);
      if (index === 0) button.className = "is-active";
      orbit.appendChild(button);
      buttons.push(button);
    }
    textFor("[data-segment-readout]", "Runtime lane 01 / private context isolated" + (state && state !== "fresh" ? " / coverage " + state : ""));
    bindSegments(buttons);
  }

  var promoteButton = one("[data-promote-fact]");
  if (promoteButton && orbitStage) {
    promoteButton.addEventListener("click", function () {
      var active = orbitStage.classList.toggle("has-promotion");
      promoteButton.textContent = active ? "Withdraw sample fact" : "Promote sample fact";
      textFor("[data-canon-state]", active ? "SAMPLE FACT / ACCEPTED" : "NO PENDING PROMOTION");
      textFor("[data-segment-event]", active ? "One approved sample fact crossed into governed canon. Private context did not follow." : "No fact has crossed into shared canon.");
    });
  }

  var assurance = one("[data-assurance]");
  if (assurance && orbitStage) {
    assurance.addEventListener("click", function () {
      var checked = assurance.getAttribute("aria-checked") !== "true";
      assurance.setAttribute("aria-checked", checked ? "true" : "false");
      orbitStage.classList.toggle("is-assurance", checked);
    });
  }

  /* Four-tier cards: all open on desktop (the layer story reads at a glance); single-open accordion on mobile. */
  var tierNarrow = window.matchMedia("(max-width: 979px)");
  function syncTiers() {
    var tiers = all(".mf-tiers details");
    if (tierNarrow.matches) tiers.forEach(function (d, i) { d.open = i === 0; });
    else tiers.forEach(function (d) { d.open = true; });
  }
  syncTiers();
  if (tierNarrow.addEventListener) tierNarrow.addEventListener("change", syncTiers);
  all(".mf-tiers details").forEach(function (detail) {
    detail.addEventListener("toggle", function () {
      if (!detail.open || !tierNarrow.matches) return;
      all(".mf-tiers details").forEach(function (other) { if (other !== detail) other.open = false; });
    });
  });

  var burger = one("#memory-burger");
  var menu = one("#memory-menu");
  function closeMenu() {
    body.classList.remove("memory-menu-open");
    if (burger) { burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Open menu"); }
    if (menu) menu.setAttribute("aria-hidden", "true");
  }
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = !body.classList.contains("memory-menu-open");
      body.classList.toggle("memory-menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", open ? "false" : "true");
    });
    all("a", menu).forEach(function (link) { link.addEventListener("click", closeMenu); });
    doc.addEventListener("keydown", function (event) { if (event.key === "Escape") closeMenu(); });
  }

  var nav = one("#nav");
  var lastY = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY || 0;
    if (nav) {
      nav.classList.toggle("scrolled", y > 24);
      nav.classList.toggle("hidden", y > lastY && y > 180 && !body.classList.contains("memory-menu-open"));
    }
    lastY = y;
  }, { passive: true });

  var form = one("[data-memory-form]");
  if (form) {
    form.addEventListener("submit", function (event) {
      if (!window.fetch) return;
      event.preventDefault();
      function get(name) { var field = one('[name="' + name + '"]', form); return field ? field.value.trim() : ""; }
      var status = one(".form-status", form);
      var button = one('button[type="submit"]', form);
      var message = [
        "interest: memory-fabric",
        "origin: memory-page",
        "what should be remembered: " + get("message"),
        "must not be retained or shared: " + (get("private_boundary") || "not specified"),
        "source evidence systems: " + (get("evidence_systems") || "not specified"),
        "how quickly the truth changes: " + (get("truth_velocity") || "not specified"),
        "deployment/privacy constraints: " + (get("deployment_constraints") || "not specified")
      ].join("\n");
      if (button) button.disabled = true;
      fetch("/api/early-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: get("email"), name: get("name"), company: "", plan: "", phone: "",
          interest: "memory-fabric", origin: "memory-page", message: message, website: get("website")
        })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (json) { return { status: response.status, body: json }; });
      }).then(function (result) {
        var ok = result.status === 200 && result.body && result.body.ok;
        if (status) {
          status.style.display = "block";
          status.style.color = ok ? "#b6ff3c" : "#ff8f8f";
          status.textContent = ok ? "Boundary-map request received. We will be in touch." : "The request could not be sent. Please retry or email sales@gridfleet.ai.";
        }
        if (ok) form.reset();
      }).catch(function () {
        if (status) {
          status.style.display = "block";
          status.style.color = "#ff8f8f";
          status.textContent = "Network error. Please retry or email sales@gridfleet.ai.";
        }
      }).finally(function () { if (button) button.disabled = false; });
    });
  }

  /* Equalize the two hero panels to each other (not to the copy column) so their bottoms align at every width. */
  var heroMachine = one(".mf-hero-machine"), heroProof = one(".mf-hero-proof");
  function syncHeroPanels() {
    if (!heroMachine || !heroProof) return;
    heroMachine.style.minHeight = ""; heroProof.style.minHeight = "";
    if (window.innerWidth < 980) return;
    var h = Math.max(heroMachine.offsetHeight, heroProof.offsetHeight);
    heroMachine.style.minHeight = h + "px"; heroProof.style.minHeight = h + "px";
  }
  window.addEventListener("resize", syncHeroPanels, { passive: true });
  window.addEventListener("load", syncHeroPanels);
  new MutationObserver(function () { window.requestAnimationFrame(syncHeroPanels); }).observe(heroProof || body, { childList: true, subtree: true, characterData: true });
  syncHeroPanels();
  doc.addEventListener("visibilitychange", function () { body.classList.toggle("is-paused", doc.hidden); });
  var year = one("#yr");
  if (year) year.textContent = String(new Date().getFullYear());
  textFor("[data-memory-state]", "LOADING");
  textFor("[data-memory-status-label]", "CONNECTING");
  all("[data-memory-value]").forEach(function (node) { var n = node.getAttribute("data-memory-value"); if (n !== "authority" && n !== "proof-authority" && !CAPTION_FALLBACK[n]) node.textContent = "\u2014"; });
  textFor("[data-memory-generated]", "Waiting for aggregate receipt\u2026");
  (function () {
    var bar = one("[data-memory-status]");
    var strong = bar && one("strong", bar);
    if (strong) strong.textContent = "Connecting to aggregate public proof.";
  })();
  loadProof();
}());
