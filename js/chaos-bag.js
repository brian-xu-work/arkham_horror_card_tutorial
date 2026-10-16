(function () {
  "use strict";

  var TOKENS = [
    { id: "p1", label: "+1", kind: "num", val: 1, tier: "good" },
    { id: "z1", label: "0", kind: "num", val: 0, tier: "neutral" },
    { id: "z2", label: "0", kind: "num", val: 0, tier: "neutral" },
    { id: "m1a", label: "−1", kind: "num", val: -1, tier: "bad" },
    { id: "m1b", label: "−1", kind: "num", val: -1, tier: "bad" },
    { id: "m1c", label: "−1", kind: "num", val: -1, tier: "bad" },
    { id: "m2a", label: "−2", kind: "num", val: -2, tier: "bad" },
    { id: "m2b", label: "−2", kind: "num", val: -2, tier: "bad" },
    { id: "m3", label: "−3", kind: "num", val: -3, tier: "bad" },
    { id: "m4", label: "−4", kind: "num", val: -4, tier: "bad" },
    { id: "skull", label: "Skull", kind: "symbol", val: -1, tier: "symbol" },
    { id: "cultist", label: "Cultist", kind: "symbol", val: -2, tier: "symbol" },
    { id: "tablet", label: "Tablet", kind: "symbol", val: -2, tier: "symbol" },
    { id: "elderthing", label: "Elder Thing", kind: "symbol", val: -3, tier: "symbol" },
    { id: "autofail", label: "☠ Auto-Fail", kind: "auto", val: null, tier: "fail" },
    { id: "eldersign", label: "✶ Elder Sign", kind: "sign", val: 2, tier: "sign" }
  ];

  var ELDER_SIGN_BONUS = 2;

  var pool = [];
  var bagState = { drawn: [], log: [] };

  function refillPool() {
    pool = TOKENS.slice();
  }
  refillPool();

  function pick(arr) {
    return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
  }

  function draw() {
    if (pool.length === 0) refillPool();
    var t = pick(pool);
    return t;
  }

  function modifier(t) {
    if (t.kind === "auto") return null;
    return t.val;
  }

  window.ArkhamBag = {
    tokens: TOKENS,
    draw: draw,
    modifier: modifier,
    remaining: function () { return pool.length; },
    reset: function () { refillPool(); }
  };

  /* ---------------- chaos bag widget ---------------- */
  var bag = document.querySelector("[data-bag]");
  if (bag) {
    var body = bag.querySelector("[data-bag-drawn]");
    var drawBtn = bag.querySelector("[data-bag-draw]");
    var resetBtn = bag.querySelector("[data-bag-reset]");
    var stats = bag.querySelector("[data-bag-stats]");
    var logEl = bag.querySelector("[data-bag-log]");

    function refreshStats() {
      var left = ArkhamBag.remaining();
      stats.textContent = left + (left === 1 ? " token" : " tokens") + " in the bag.";
    }

    function logClass(t) {
      if (t.tier === "good") return "is-good";
      if (t.tier === "fail") return "is-fail";
      if (t.tier === "bad" || t.tier === "symbol") return "is-bad";
      return "";
    }

    drawBtn.addEventListener("click", function () {
      var t = draw();
      body.textContent = t.label;
      body.classList.remove("is-pop");
      void body.offsetWidth;
      body.classList.add("is-pop");

      var li = document.createElement("li");
      li.className = logClass(t);
      li.textContent = t.label;
      logEl.appendChild(li);
      bagState.log.push(t.label);

      refreshStats();
    });

    resetBtn.addEventListener("click", function () {
      ArkhamBag.reset();
      body.textContent = "?";
      logEl.innerHTML = "";
      refreshStats();
    });

    refreshStats();
  }

  /* ---------------- skill test builder ---------------- */
  var st = document.querySelector("[data-skilltest]");
  if (st) {
    var state = { base: 3, diff: 3, committed: 0, token: null, resolved: false };

    var baseVal = st.querySelector("[data-base-value]");
    var baseUp = st.querySelector("[data-base-up]");
    var baseDown = st.querySelector("[data-base-down]");
    var diffVal = st.querySelector("[data-diff-value]");
    var diffUp = st.querySelector("[data-diff-up]");
    var diffDown = st.querySelector("[data-diff-down]");
    var commits = Array.prototype.slice.call(st.querySelectorAll("[data-commit]"));
    var drawBtn = st.querySelector("[data-test-draw]");
    var resetBtn = st.querySelector("[data-test-reset]");
    var mBase = st.querySelector("[data-math-base]");
    var mCommit = st.querySelector("[data-math-commit]");
    var mToken = st.querySelector("[data-math-token]");
    var mTotal = st.querySelector("[data-math-total]");
    var verdict = st.querySelector("[data-test-verdict]");

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function render() {
      baseVal.textContent = state.base;
      diffVal.textContent = state.diff;
      mBase.textContent = state.base;

      var commitText = (state.committed >= 0 ? "+" : "") + state.committed;
      mCommit.textContent = commitText;

      var tokenText = state.token ? state.token.label : "—";
      mToken.textContent = tokenText;

      var total = state.base + state.committed;
      if (state.token) {
        if (state.token.kind === "auto") {
          mTotal.textContent = "Auto-Fail";
        } else {
          var tv = state.token.kind === "sign" ? ELDER_SIGN_BONUS : state.token.val;
          total += tv;
          mTotal.textContent = total + " vs " + state.diff;
        }
      } else {
        mTotal.textContent = total + " vs " + state.diff;
      }

      verdict.classList.remove("is-win", "is-lose");
      if (!state.token) {
        verdict.textContent = "Set it up, then reveal a token.";
      } else if (state.token.kind === "auto") {
        verdict.classList.add("is-lose");
        verdict.textContent = "Auto-Fail. The test fails, no matter your value.";
      } else {
        var t2 = state.base + state.committed + (state.token.kind === "sign" ? ELDER_SIGN_BONUS : state.token.val);
        if (t2 >= state.diff) {
          verdict.classList.add("is-win");
          verdict.textContent = "Success! " + t2 + " meets or beats " + state.diff + ".";
        } else {
          verdict.classList.add("is-lose");
          verdict.textContent = "Failure. " + t2 + " is short of " + state.diff + ".";
        }
      }
    }

    baseUp.addEventListener("click", function () { state.base = clamp(state.base + 1, 0, 9); clearToken(); render(); });
    baseDown.addEventListener("click", function () { state.base = clamp(state.base - 1, 0, 9); clearToken(); render(); });
    diffUp.addEventListener("click", function () { state.diff = clamp(state.diff + 1, 0, 9); clearToken(); render(); });
    diffDown.addEventListener("click", function () { state.diff = clamp(state.diff - 1, 0, 9); clearToken(); render(); });

    commits.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = parseInt(btn.getAttribute("data-commit"), 10);
        var on = btn.classList.toggle("is-committed");
        state.committed += on ? v : -v;
        render();
      });
    });

    function clearToken() {
      state.token = null;
    }

    drawBtn.addEventListener("click", function () {
      state.token = draw();
      render();
    });

    resetBtn.addEventListener("click", function () {
      state.base = 3;
      state.diff = 3;
      state.committed = 0;
      state.token = null;
      commits.forEach(function (b) { b.classList.remove("is-committed"); });
      render();
    });

    render();
  }
})();
