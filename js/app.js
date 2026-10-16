import { track } from "@vercel/analytics";

(function () {
  "use strict";

  /* ---------------- rail + scroll spy + progress ---------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-step]"));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll("[data-step-link]"));
  var progressBar = document.querySelector("[data-progress-bar]");
  var currentStepEl = document.querySelector("[data-current-step]");
  var stepWord = document.querySelector("[data-step-word]");
  var rail = document.querySelector("[data-rail]");
  var menuToggle = document.querySelector("[data-menu-toggle]");

  var stepIndex = {};
  sections.forEach(function (s) {
    stepIndex[s.getAttribute("data-step")] = s;
  });

  var numberedTotal = 18;

  function setActive(step) {
    railLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-step-link") === step);
    });
    if (progressBar) {
      var n = parseInt(step, 10);
      var pct = isNaN(n) || n === 0 ? 0 : Math.min(100, (n / numberedTotal) * 100);
      progressBar.style.width = pct + "%";
    }
    if (currentStepEl) {
      var n2 = parseInt(step, 10);
      currentStepEl.textContent = !isNaN(n2) && n2 > 0 && n2 <= 18 ? n2 : "•";
    }
  }

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(e.target.getAttribute("data-step"));
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------------- mobile menu ---------------- */
  if (menuToggle && rail) {
    menuToggle.addEventListener("click", function () {
      var open = rail.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    });
    rail.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        rail.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      }
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if ("IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- card flips ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-flip]"), function (card) {
    card.addEventListener("click", function () {
      var on = card.getAttribute("aria-pressed") === "true";
      card.setAttribute("aria-pressed", on ? "false" : "true");
    });
  });

  /* ---------------- phase tabs ---------------- */
  var phases = document.querySelector("[data-phases]");
  if (phases) {
    var tabs = Array.prototype.slice.call(phases.querySelectorAll("[data-phase-tab]"));
    var panels = Array.prototype.slice.call(phases.querySelectorAll("[data-phase-panel]"));
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-phase-tab");
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach(function (p) {
          p.classList.toggle("is-active", p.getAttribute("data-phase-panel") === key);
        });
      });
    });
  }

  /* ---------------- setup checklist ---------------- */
  var checklist = document.querySelector("[data-checklist]");
  if (checklist) {
    var KEY = "ah-checklist";
    var saved = {};
    var setupTracked = false;
    var checks = Array.prototype.slice.call(checklist.querySelectorAll("input[data-check]"));
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { saved = {}; }

    checks.forEach(function (input) {
      var id = input.getAttribute("data-check");
      if (saved[id]) input.checked = true;
      input.addEventListener("change", function () {
        saved[id] = input.checked;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
        if (!setupTracked && checks.length && checks.every(function (i) { return i.checked; })) {
          setupTracked = true;
          track("setup_completed", {});
        }
      });
    });

    var resetBtn = document.querySelector("[data-checklist-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        saved = {};
        try { localStorage.removeItem(KEY); } catch (e) {}
        Array.prototype.forEach.call(checklist.querySelectorAll("input[data-check]"), function (i) {
          i.checked = false;
        });
      });
    }
  }

  /* ---------------- guided playthrough ---------------- */
  var pt = document.querySelector("[data-playthrough]");
  if (pt) {
    var beats = [
      {
        phase: "Mythos Phase",
        title: "Doom gathers",
        text: "1 doom goes onto the Agenda; the countdown has started. Roland then draws an encounter card: a Ghoul claws its way into the Study, already engaged with him.",
        state: [["Health 9", ""], ["Sanity 5", ""], ["Actions 0", ""], ["Enemy: Ghoul", "bad"]]
      },
      {
        phase: "Investigation · Action 1",
        title: "Investigate the Study",
        text: "Roland tests Intellect 3 against the Study's shroud of 2. He draws a −1 token, so his total is 2. That meets the difficulty, so he discovers 1 clue.",
        state: [["Clues 1", "good"], ["Actions 2", ""], ["Enemy: Ghoul", "bad"]]
      },
      {
        phase: "Investigation · Action 2",
        title: "Fight the Ghoul",
        text: "Roland tests Combat 4 against the Ghoul's fight value of 3. A 0 token keeps him at 4. Success: he deals 1 damage, dropping the Ghoul to 2 health.",
        state: [["Clues 1", "good"], ["Actions 1", ""], ["Ghoul 2 HP", "bad"]]
      },
      {
        phase: "Investigation · Action 3",
        title: "Strike again",
        text: "One more swing. Roland draws a −1, landing exactly on 3 against a fight of 3. A tie is a success, so he deals another damage. The Ghoul is down to 1.",
        state: [["Clues 1", "good"], ["Actions 0", ""], ["Ghoul 1 HP", "bad"]]
      },
      {
        phase: "Enemy Phase",
        title: "The Ghoul strikes back",
        text: "Still engaged, the Ghoul attacks. Roland takes 1 damage and 1 horror. He is hurt but alive, and the Ghoul is nearly finished.",
        state: [["Health 8", "bad"], ["Sanity 4", "bad"], ["Ghoul 1 HP", "bad"]]
      },
      {
        phase: "Upkeep Phase",
        title: "Regroup, and next round",
        text: "Roland readies his cards, draws 1 card (hand of 6), and gains 1 resource (6 total). The round ends, and the next one opens with Mythos again.",
        state: [["Health 8", ""], ["Resources 6", "good"], ["Hand 6", "good"], ["Round 2", ""]]
      }
    ];

    var ptPhase = pt.querySelector("[data-pt-phase]");
    var ptTitle = pt.querySelector("[data-pt-title]");
    var ptText = pt.querySelector("[data-pt-text]");
    var ptState = pt.querySelector("[data-pt-state]");
    var nextBtn = pt.querySelector("[data-pt-next]");
    var prevBtn = pt.querySelector("[data-pt-prev]");
    var dots = pt.querySelector("[data-pt-dots]");
    var cur = 0;

    beats.forEach(function (b, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("aria-label", "Go to step " + (i + 1));
      d.addEventListener("click", function () { go(i); });
      dots.appendChild(d);
    });

    function go(i) {
      cur = Math.max(0, Math.min(beats.length - 1, i));
      var b = beats[cur];
      ptPhase.textContent = b.phase;
      ptTitle.textContent = b.title;
      ptText.textContent = b.text;
      ptState.innerHTML = b.state.map(function (s) {
        return '<span class="state-chip' + (s[1] ? " state-chip--" + s[1] : "") + '">' + s[0] + "</span>";
      }).join("");
      prevBtn.disabled = cur === 0;
      nextBtn.disabled = cur === beats.length - 1;
      nextBtn.textContent = cur === beats.length - 1 ? "Round complete" : "Next";
      Array.prototype.forEach.call(dots.children, function (d, n) {
        d.classList.toggle("is-active", n === cur);
      });
    }

    nextBtn.addEventListener("click", function () { go(cur + 1); });
    prevBtn.addEventListener("click", function () { go(cur - 1); });
    go(0);
  }

  /* ---------------- combat demo ---------------- */
  var combat = document.querySelector("[data-combat]");
  if (combat && window.ArkhamBag) {
    var hp = 4;
    var hpEl = combat.querySelector("[data-enemy-hp]");
    var prompt = combat.querySelector("[data-combat-prompt]");
    var log = combat.querySelector("[data-combat-log]");
    var fightBtn = combat.querySelector("[data-combat-fight]");
    var evadeBtn = combat.querySelector("[data-combat-evade]");
    var resetBtn = combat.querySelector("[data-combat-reset]");

    function addLog(text, tone) {
      var li = document.createElement("li");
      if (tone) li.className = "is-" + tone;
      li.textContent = text;
      log.insertBefore(li, log.firstChild);
    }

    function value(token, base) {
      if (token.kind === "auto") return null;
      var v = token.kind === "sign" ? 2 : token.val;
      return base + v;
    }

    function fight() {
      if (hp <= 0) return;
      var token = window.ArkhamBag.draw();
      var total = value(token, 4);
      if (total === null) {
        addLog("Combat test: Auto-Fail. Roland misses.", "bad");
      } else if (total >= 3) {
        hp--;
        hpEl.textContent = hp;
        addLog("Combat test: " + total + " vs 3, success. 1 damage dealt.", "good");
      } else {
        addLog("Combat test: " + total + " vs 3, failure. No damage.", "bad");
      }
      if (hp <= 0) {
        hpEl.textContent = "0";
        prompt.textContent = "Defeated. Roland earns his clue from his ability.";
        fightBtn.disabled = true;
        evadeBtn.disabled = true;
      }
    }

    function evade() {
      var token = window.ArkhamBag.draw();
      var total = value(token, 2);
      if (total === null) {
        addLog("Evade test: Auto-Fail. It holds on.", "bad");
      } else if (total >= 3) {
        addLog("Evade test: " + total + " vs 3, success. It is exhausted and cannot attack.", "good");
      } else {
        addLog("Evade test: " + total + " vs 3, failure. It stays engaged.", "bad");
      }
    }

    function reset() {
      hp = 4;
      hpEl.textContent = hp;
      prompt.textContent = "It is on you. Fight it down, or slip away.";
      log.innerHTML = "";
      fightBtn.disabled = false;
      evadeBtn.disabled = false;
    }

    fightBtn.addEventListener("click", fight);
    evadeBtn.addEventListener("click", evade);
    resetBtn.addEventListener("click", reset);
  }
})();
