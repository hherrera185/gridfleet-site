/* GridFleet public site JS.
   Early-access form handler: POSTs JSON to the /api/early-access worker.
   Forms opt in with the data-early-access attribute. Without JS the form
   falls back to a native POST to the same endpoint (worker also accepts
   form-encoded bodies). */
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
