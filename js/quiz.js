(function () {
  "use strict";

  var QUESTIONS = [
    {
      q: "Your total skill value is 3. The test difficulty is 3. What happens?",
      options: [
        "You fail, you needed 4 or more",
        "You succeed, matching the difficulty counts",
        "You draw a second token to break the tie",
        "The test is cancelled"
      ],
      answer: 1,
      why: "A test succeeds if the modified value is equal to or greater than the difficulty. A tie is a win."
    },
    {
      q: "You reveal the tentacle token (Auto-Fail) on a test where you had a huge skill value. What happens?",
      options: [
        "You still succeed, your value was high enough",
        "You succeed but lose 1 sanity",
        "The test automatically fails",
        "You may redraw the token"
      ],
      answer: 2,
      why: "The Auto-Fail token makes the test fail regardless of how high your skill value is. There is always a chance the dark wins."
    },
    {
      q: "How many actions does each investigator get during the Investigation phase?",
      options: ["1", "2", "3", "As many as they can afford"],
      answer: 2,
      why: "Each investigator gets three actions, spent one at a time, in any order and on any mix of actions."
    },
    {
      q: "When does doom get placed on the active Agenda during a normal round?",
      options: [
        "During the Investigation phase, only if you investigate",
        "During the Mythos phase, 1 doom each round",
        "During the Upkeep phase, 1 doom each round",
        "Only when a card tells you to"
      ],
      answer: 1,
      why: "The Mythos phase places 1 doom on the active Agenda every round, and the Agenda advances if that fills its threshold."
    },
    {
      q: "How do you normally advance the Act and move the story forward?",
      options: [
        "By defeating enemies",
        "By spending clues at the right location",
        "By running out your deck",
        "By surviving a set number of rounds"
      ],
      answer: 1,
      why: "You advance the Act by spending the required number of clues, usually while at a specific location named by the Act card."
    },
    {
      q: "You are terrified of the Ghoul on you and cannot kill it this turn. What does a successful Evade do?",
      options: [
        "Deals 1 damage to it",
        "Moves it to another location",
        "Exhausts it so it cannot attack this round",
        "Nothing, Evade is only for the enemy phase"
      ],
      answer: 2,
      why: "A successful Evade exhausts the enemy and disengages it. An exhausted enemy does not attack, buying you a round of safety."
    }
  ];

  var root = document.querySelector("[data-quiz]");
  if (!root) return;

  var body = root.querySelector("[data-quiz-body]");
  var countEl = root.querySelector("[data-quiz-count]");
  var progEl = root.querySelector("[data-quiz-progress-bar]");
  var scoreEl = root.querySelector("[data-quiz-score]");
  var restart = root.querySelector("[data-quiz-restart]");

  var idx = 0;
  var score = 0;
  var answered = false;

  function renderProgress() {
    var pct = (idx / QUESTIONS.length) * 100;
    progEl.style.width = pct + "%";
    countEl.textContent = "Question " + Math.min(idx + 1, QUESTIONS.length) + " of " + QUESTIONS.length;
  }

  function renderQuestion() {
    answered = false;
    var q = QUESTIONS[idx];
    renderProgress();
    countEl.textContent = "Question " + (idx + 1) + " of " + QUESTIONS.length;

    var html = "";
    html += '<p class="quizbox__q">' + q.q + "</p>";
    html += '<div class="quizbox__opts">';
    q.options.forEach(function (opt, i) {
      html += '<button class="quiz-opt" data-opt="' + i + '">' + opt + "</button>";
    });
    html += "</div>";
    html += '<div class="quizbox__fb" data-fb></div>';
    body.innerHTML = html;

    body.querySelectorAll("[data-opt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        choose(parseInt(btn.getAttribute("data-opt"), 10));
      });
    });
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    var q = QUESTIONS[idx];
    var opts = body.querySelectorAll(".quiz-opt");
    opts.forEach(function (btn, n) {
      btn.disabled = true;
      if (n === q.answer) btn.classList.add("is-correct");
      if (n === i && i !== q.answer) btn.classList.add("is-wrong");
    });

    var correct = i === q.answer;
    if (correct) score++;
    scoreEl.textContent = "Score " + score + " / " + QUESTIONS.length;

    var fb = body.querySelector("[data-fb]");
    fb.classList.add("is-shown");
    fb.innerHTML = (correct ? "<strong>Correct.</strong> " : "<strong>Not quite.</strong> ") + q.why;

    var next = document.createElement("button");
    next.className = "btn btn--ghost";
    next.style.marginTop = "1.1rem";
    next.textContent = idx < QUESTIONS.length - 1 ? "Next question" : "See result";
    next.addEventListener("click", advance);
    fb.appendChild(next);
  }

  function advance() {
    idx++;
    if (idx < QUESTIONS.length) {
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    progEl.style.width = "100%";
    countEl.textContent = "Finished";
    var verdict = score === QUESTIONS.length
      ? "Flawless. You are ready to play."
      : score >= 4
        ? "Solid. Skim the steps you missed and set up the box."
        : "Worth another pass through the steps. It clicks fast once you play.";
    body.innerHTML =
      '<div class="quizbox__done">' +
      '<p class="quizbox__q">' + score + " / " + QUESTIONS.length + "</p>" +
      '<p class="lede" style="max-width:none;margin:0 auto">' + verdict + "</p>" +
      "</div>";
    scoreEl.textContent = "Score " + score + " / " + QUESTIONS.length;
    restart.hidden = false;
  }

  restart.addEventListener("click", function () {
    idx = 0;
    score = 0;
    restart.hidden = true;
    scoreEl.textContent = "Score " + score + " / " + QUESTIONS.length;
    renderQuestion();
  });

  renderQuestion();
})();
