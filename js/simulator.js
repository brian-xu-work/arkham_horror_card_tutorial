import { track } from "@vercel/analytics";

(function () {
  "use strict";

  var root = document.querySelector("[data-sim]");
  if (!root || !window.ArkhamBag) return;

  /* ============ data ============ */
  var STATS = { will: 3, int: 3, com: 4, agi: 2 };
  var SKILL_NAME = { will: "Willpower", int: "Intellect", com: "Combat", agi: "Agility" };

  var LOCATIONS = {
    study: { id: "study", name: "Study", shroud: 2, clues: 2, links: ["hallway"] },
    hallway: { id: "hallway", name: "Hallway", shroud: 1, clues: 0, links: ["study", "attic", "cellar"] },
    attic: { id: "attic", name: "Attic", shroud: 3, clues: 2, links: ["hallway"] },
    cellar: { id: "cellar", name: "Cellar", shroud: 4, clues: 2, links: ["hallway"] }
  };

  var AGENDAS = [
    { name: "Agenda 1 · The House", threshold: 3, advance: "spawnPriest" },
    { name: "Agenda 2 · The Dark", threshold: 4, advance: "lose" }
  ];

  var PLAYER_DECK = [
    { name: ".45 Automatic", type: "asset", cost: 4, com: 2, dmg: 1, icons: {}, text: "+2 Combat. Fights deal 1 extra damage." },
    { name: "Machete", type: "asset", cost: 3, com: 1, dmg: 0, icons: {}, text: "+1 Combat." },
    { name: "Machete", type: "asset", cost: 3, com: 1, dmg: 0, icons: {}, text: "+1 Combat." },
    { name: "Emergency Cache", type: "event", cost: 0, icons: {}, text: "Gain 3 resources.", effect: "res3" },
    { name: "Emergency Cache", type: "event", cost: 0, icons: {}, text: "Gain 3 resources.", effect: "res3" },
    { name: "Evidence!", type: "event", cost: 1, icons: { int: 1 }, text: "Discover 1 clue at your location.", effect: "clue1" },
    { name: "Working a Hunch", type: "event", cost: 2, icons: { int: 1 }, text: "Discover 1 clue at your location.", effect: "clue1" },
    { name: "Deduction", type: "skill", icons: { int: 1 }, text: "Commit to an Intellect test." },
    { name: "Deduction", type: "skill", icons: { int: 1 }, text: "Commit to an Intellect test." },
    { name: "Perception", type: "skill", icons: { int: 2 }, text: "Commit to an Intellect test." },
    { name: "Vicious Blow", type: "skill", icons: { com: 2 }, text: "Commit to a Combat test." },
    { name: "Overpower", type: "skill", icons: { com: 1 }, text: "Commit to a Combat test." },
    { name: "Guts", type: "skill", icons: { will: 2 }, text: "Commit to a Willpower test." },
    { name: "Unexpected Courage", type: "skill", icons: { wild: 2 }, text: "Commit to any test." }
  ];

  var ENCOUNTER_DECK = [
    { name: "Ghoul Minion", type: "enemy", fight: 3, hp: 2, evade: 2, dmg: 1, horror: 1 },
    { name: "Ghoul Minion", type: "enemy", fight: 3, hp: 2, evade: 2, dmg: 1, horror: 1 },
    { name: "Swamp Lurker", type: "enemy", fight: 3, hp: 4, evade: 3, dmg: 1, horror: 1 },
    { name: "Rotting Remains", type: "treachery", test: "will", diff: 3, fail: { horror: 2 }, text: "Willpower test 3. On a failure, take 2 horror." },
    { name: "Grasping Hands", type: "treachery", test: "agi", diff: 3, fail: { damage: 2 }, text: "Agility test 3. On a failure, take 2 damage." },
    { name: "Ancient Evils", type: "treachery", text: "Place 1 additional doom on the Agenda.", effect: "doom1" },
    { name: "Crypt Chill", type: "treachery", test: "will", diff: 4, fail: { damage: 1, horror: 1 }, text: "Willpower test 4. On a failure, take 1 damage and 1 horror." }
  ];

  /* ============ helpers ============ */
  var uid = 0;
  function shuffle(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = b[i]; b[i] = b[j]; b[j] = t;
    }
    return b;
  }
  function clone(c) { var o = {}; for (var k in c) o[k] = c[k]; o.uid = "c" + (++uid); return o; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ============ state ============ */
  var S;
  function initState() {
    S = {
      phase: "mythos",
      round: 1,
      hp: 9, hpMax: 9,
      san: 5, sanMax: 5,
      resources: 5,
      actions: 0,
      clues: 0,
      location: "study",
      locations: JSON.parse(JSON.stringify(LOCATIONS)),
      enemies: [],
      assets: [],
      hand: [],
      deck: shuffle(PLAYER_DECK.map(clone)),
      discard: [],
      encounter: shuffle(ENCOUNTER_DECK.map(clone)),
      doom: 0,
      agendaIndex: 0,
      actAdvanced: false,
      status: "playing",
      log: [],
      test: null,
      encounterCard: null
    };
    for (var i = 0; i < 5; i++) drawCard(true);
    enterMythos(true);
  }

  function log(text, tone) {
    S.log.unshift({ text: text, tone: tone || "" });
    if (S.log.length > 40) S.log.pop();
  }

  function drawCard(silent) {
    if (S.deck.length === 0) {
      if (S.discard.length === 0) return null;
      S.deck = shuffle(S.discard);
      S.discard = [];
      S.san = clamp(S.san - 1, 0, S.sanMax);
      if (!silent) log("Your deck was empty. You take 1 horror and shuffle your discard back in.", "bad");
    }
    var c = S.deck.shift();
    S.hand.push(c);
    return c;
  }

  function combatBonus() {
    return S.assets.reduce(function (n, a) { return n + (a.com || 0); }, 0);
  }
  function damageBonus() {
    return S.assets.reduce(function (n, a) { return n + (a.dmg || 0); }, 0);
  }

  function checkDeath() {
    if (S.status !== "playing") return;
    if (S.hp <= 0) { S.status = "lost"; S.loseReason = "Roland was defeated by damage."; log("Health hit zero. Roland is defeated.", "bad"); }
    else if (S.san <= 0) { S.status = "lost"; S.loseReason = "Roland was driven insane."; log("Sanity hit zero. Roland is defeated.", "bad"); }
    if (S.status === "lost") track("sim_round_lost", { round: S.round, reason: S.loseReason });
  }

  /* ============ phases ============ */
  function enterMythos(silent) {
    S.phase = "mythos";
    S.doom += 1;
    if (!silent) log("Mythos: 1 doom goes onto " + AGENDAS[S.agendaIndex].name + ".", "bad");
    else log("The round begins. 1 doom goes onto the Agenda.", "bad");
    agendaCheck();
    render();
  }

  function agendaCheck() {
    var ag = AGENDAS[S.agendaIndex];
    if (S.doom >= ag.threshold) {
      if (ag.advance === "lose") {
        S.status = "lost";
        S.loseReason = "The Agenda ran out before the Act was finished.";
        log("The Agenda is full. The scenario ends badly.", "bad");
        return;
      }
      S.agendaIndex += 1;
      S.doom = 0;
      log("Doom filled the Agenda. It advances to " + AGENDAS[S.agendaIndex].name + "!", "bad");
      if (ag.advance === "spawnPriest") {
        S.enemies.push({
          uid: "e" + (++uid), name: "Ghoul Priest", fight: 4, hp: 5, hpMax: 5,
          evade: 4, dmg: 2, horror: 2, at: S.location, exhausted: false, elite: true
        });
        log("A Ghoul Priest bursts in, engaged with Roland!", "bad");
      }
    }
  }

  function resolveEncounter() {
    if (S.test) return;
    if (S.encounter.length === 0) S.encounter = shuffle(ENCOUNTER_DECK.map(clone));
    var card = S.encounter.shift();
    S.encounterCard = card;
    if (card.type === "enemy") {
      S.enemies.push({
        uid: "e" + (++uid), name: card.name, fight: card.fight, hp: card.hp, hpMax: card.hp,
        evade: card.evade, dmg: card.dmg, horror: card.horror, at: S.location, exhausted: false
      });
      log("Encounter: " + card.name + " appears and engages Roland.", "bad");
      S.phase = "investigation";
      S.actions = 3;
      render();
    } else if (card.effect === "doom1") {
      S.doom += 1;
      log("Encounter: " + card.name + ". 1 extra doom on the Agenda.", "bad");
      agendaCheck();
      S.phase = "investigation";
      S.actions = 3;
      render();
    } else {
      log("Encounter: " + card.name + ". " + card.text, "bad");
      beginTest({
        label: card.name,
        skill: card.test,
        base: STATS[card.test],
        diff: card.diff,
        onResolve: function (success) {
          if (!success && card.fail) {
            if (card.fail.damage) S.hp = clamp(S.hp - card.fail.damage, 0, S.hpMax);
            if (card.fail.horror) S.san = clamp(S.san - card.fail.horror, 0, S.sanMax);
            log("The treachery bites: " + (card.fail.damage ? card.fail.damage + " damage " : "") + (card.fail.horror ? card.fail.horror + " horror." : ""), "bad");
          } else if (success) {
            log("Roland shrugs it off.", "good");
          }
          checkDeath();
          S.phase = "investigation";
          S.actions = 3;
          render();
        }
      });
    }
  }

  function resolveEnemyPhase() {
    if (S.test || S.phase !== "enemy") return;
    var arrived = false;
    S.enemies.forEach(function (e) {
      if (e.exhausted) { log(e.name + " is exhausted and cannot attack.", ""); return; }
      if (e.at === S.location) {
        S.hp = clamp(S.hp - e.dmg, 0, S.hpMax);
        S.san = clamp(S.san - e.horror, 0, S.sanMax);
        log(e.name + " attacks: " + e.dmg + " damage, " + e.horror + " horror.", "bad");
      } else {
        e.at = stepToward(e.at, S.location);
        arrived = true;
        log(e.name + " lumbers closer, now in the " + S.locations[e.at].name + ".", "");
      }
    });
    checkDeath();
    if (S.status !== "playing") { render(); return; }
    S.phase = "upkeep";
    render();
  }

  function stepToward(from, to) {
    if (from === to) return from;
    var links = S.locations[from].links;
    if (links.indexOf(to) !== -1) return to;
    var queue = [[from, from]];
    var seen = {}; seen[from] = true;
    while (queue.length) {
      var node = queue.shift();
      var loc = node[0], first = node[1];
      var ns = S.locations[loc].links;
      for (var i = 0; i < ns.length; i++) {
        if (seen[ns[i]]) continue;
        if (ns[i] === to) return first === from ? ns[i] : first;
        seen[ns[i]] = true;
        queue.push([ns[i], first === from ? ns[i] : first]);
      }
    }
    return from;
  }

  function endRound() {
    if (S.test || S.phase !== "upkeep") return;
    S.enemies.forEach(function (e) { e.exhausted = false; });
    drawCard();
    S.resources += 1;
    while (S.hand.length > 8) S.discard.push(S.hand.pop());
    S.round += 1;
    log("Upkeep: cards readied, 1 card drawn, 1 resource gained. Round " + S.round + " begins.", "");
    enterMythos();
  }

  /* ============ actions ============ */
  function spendAction() { S.actions = Math.max(0, S.actions - 1); }

  function actInvestigate() {
    if (S.test || S.actions <= 0) return;
    var loc = S.locations[S.location];
    if (loc.clues <= 0) { log("There are no clues left in the " + loc.name + ".", ""); return; }
    spendAction();
    beginTest({
      label: "Investigate the " + loc.name,
      skill: "int", base: STATS.int, diff: loc.shroud,
      onResolve: function (success) {
        if (success) {
          loc.clues -= 1;
          S.clues += 1;
          log("Investigate success. Roland finds 1 clue. (" + S.clues + " total)", "good");
        } else {
          log("Investigate failed. No clue found.", "bad");
        }
        render();
      }
    });
  }

  function actMove(to) {
    if (S.test || S.actions <= 0) return;
    if (S.locations[S.location].links.indexOf(to) === -1) return;
    spendAction();
    S.location = to;
    log("Roland moves to the " + S.locations[to].name + ".", "");
    render();
  }

  function actFight(e) {
    if (S.test || S.actions <= 0) return;
    spendAction();
    var base = STATS.com + combatBonus();
    beginTest({
      label: "Fight " + e.name,
      skill: "com", base: base, diff: e.fight,
      onResolve: function (success) {
        if (success) {
          var dmg = 1 + damageBonus();
          e.hp -= dmg;
          log("Fight success. " + dmg + " damage to " + e.name + ".", "good");
          if (e.hp <= 0) {
            S.enemies = S.enemies.filter(function (x) { return x.uid !== e.uid; });
            log(e.name + " is defeated. Roland's ability finds 1 clue here.", "good");
            var loc = S.locations[S.location];
            if (loc.clues > 0) { loc.clues -= 1; S.clues += 1; }
          }
        } else {
          log("Fight failed. " + e.name + " is unharmed.", "bad");
        }
        render();
      }
    });
  }

  function actEvade(e) {
    if (S.test || S.actions <= 0) return;
    spendAction();
    beginTest({
      label: "Evade " + e.name,
      skill: "agi", base: STATS.agi, diff: e.evade,
      onResolve: function (success) {
        if (success) {
          e.exhausted = true;
          log("Evade success. " + e.name + " is exhausted and will not attack.", "good");
        } else {
          log("Evade failed. " + e.name + " holds on.", "bad");
        }
        render();
      }
    });
  }

  function actPlay(card) {
    if (S.test || S.actions <= 0) return;
    if (card.type === "skill") { log(card.name + " can only be committed to a test, not played.", ""); return; }
    if (S.resources < card.cost) { log("Not enough resources for " + card.name + ".", ""); return; }
    spendAction();
    S.resources -= card.cost;
    S.hand = S.hand.filter(function (c) { return c.uid !== card.uid; });
    S.discard.push(card);
    if (card.type === "asset") {
      S.assets.push(card);
      log("Roland plays " + card.name + ". " + card.text, "good");
    } else {
      if (card.effect === "res3") { S.resources += 3; log("Roland plays " + card.name + ": +3 resources.", "good"); }
      else if (card.effect === "clue1") {
        var loc = S.locations[S.location];
        if (loc.clues > 0) { loc.clues -= 1; S.clues += 1; log("Roland plays " + card.name + ": discovers 1 clue.", "good"); }
        else log("Roland plays " + card.name + ", but there are no clues here to find.", "");
      }
    }
    render();
  }

  function actDrawCard() {
    if (S.test || S.actions <= 0) return;
    spendAction();
    var c = drawCard();
    if (c) log("Roland spends an action to draw " + c.name + ".", "");
    render();
  }

  function actResource() {
    if (S.test || S.actions <= 0) return;
    spendAction();
    S.resources += 1;
    log("Roland takes a resource. (" + S.resources + ")", "");
    render();
  }

  function actAdvance() {
    if (S.test) return;
    if (S.clues < 2) return;
    if (S.location !== "hallway") { log("Roland must be in the Hallway to advance the Act.", ""); return; }
    S.clues -= 2;
    S.actAdvanced = true;
    S.status = "won";
    log("Roland spends 2 clues and advances the Act. The story moves on, and the chapter is won.", "good");
    track("sim_round_won", { round: S.round });
    render();
  }

  function endTurn() {
    if (S.test || S.phase !== "investigation") return;
    S.phase = "enemy";
    render();
  }

  /* ============ skill test ============ */
  function beginTest(cfg) {
    S.test = {
      label: cfg.label, skill: cfg.skill, base: cfg.base, diff: cfg.diff,
      onResolve: cfg.onResolve, commits: [], stage: "commit", token: null, total: null, success: null
    };
    renderTest();
  }

  function commitValue(card, skill) {
    var ic = card.icons || {};
    if (ic[skill]) return ic[skill];
    if (ic.wild) return ic.wild;
    return 0;
  }

  function revealToken() {
    var t = S.test;
    if (t.stage !== "commit") return;
    var token = window.ArkhamBag.draw();
    var commitSum = t.commits.reduce(function (n, c) { return n + commitValue(c, t.skill); }, 0);
    var total = t.base + commitSum + (token.kind === "sign" ? 2 : token.kind === "auto" ? 0 : token.val);
    var success = token.kind === "auto" ? false : total >= t.diff;
    t.commits.forEach(function (c) {
      S.hand = S.hand.filter(function (h) { return h.uid !== c.uid; });
      S.discard.push(c);
    });
    t.commits = [];
    t.token = token;
    t.total = total;
    t.success = success;
    t.commitSum = commitSum;
    t.stage = "result";
    renderTest();
  }

  function closeTest() {
    var cb = S.test.onResolve;
    var success = S.test.success;
    S.test = null;
    renderTest();
    render();
    if (cb) cb(success);
  }

  /* ============ render ============ */
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function render() {
    renderPhases();
    renderHero();
    renderLocations();
    renderEnemies();
    renderHand();
    renderStory();
    renderLog();
    renderControls();
  }

  function renderPhases() {
    var order = [["mythos", "Mythos"], ["investigation", "Investigation"], ["enemy", "Enemy"], ["upkeep", "Upkeep"]];
    var host = root.querySelector("[data-sim-phases]");
    host.innerHTML = order.map(function (p) {
      var active = S.phase === p[0];
      return '<span class="sim-phase' + (active ? " is-active" : "") + '"><i>' + (order.indexOf(p) + 1) + "</i>" + p[1] + "</span>";
    }).join("") + '<span class="sim-phase sim-phase--round">Round ' + S.round + "</span>";
  }

  function bar(cur, max, kind) {
    var pct = Math.round((cur / max) * 100);
    return '<div class="sim-bar sim-bar--' + kind + '"><span style="width:' + pct + '%"></span></div>';
  }

  function renderHero() {
    var host = root.querySelector("[data-sim-hero]");
    host.innerHTML =
      '<div class="sim-hero__top">' +
        '<p class="sim-hero__class">Guardian</p>' +
        '<h3 class="sim-hero__name">Roland Banks</h3>' +
      "</div>" +
      '<div class="sim-vital">' +
        '<div class="sim-vital__row"><span>Health</span><b>' + S.hp + " / " + S.hpMax + "</b></div>" +
        bar(S.hp, S.hpMax, "hp") +
      "</div>" +
      '<div class="sim-vital">' +
        '<div class="sim-vital__row"><span>Sanity</span><b>' + S.san + " / " + S.sanMax + "</b></div>" +
        bar(S.san, S.sanMax, "san") +
      "</div>" +
      '<div class="sim-stats">' +
        '<span class="sim-pill"><b>' + S.actions + "</b> actions</span>" +
        '<span class="sim-pill"><b>' + S.resources + "</b> resources</span>" +
        '<span class="sim-pill"><b>' + S.clues + "</b> clues</span>" +
      "</div>" +
      (S.assets.length ? '<div class="sim-assets"><span class="sim-assets__label">In play</span>' + S.assets.map(function (a) { return '<span class="sim-asset">' + a.name + "</span>"; }).join("") + "</div>" : "");
  }

  function renderLocations() {
    var host = root.querySelector("[data-sim-locations]");
    var hint = root.querySelector("[data-sim-loc-hint]");
    hint.textContent = "You are in the " + S.locations[S.location].name + ".";
    var canMove = S.phase === "investigation" && S.actions > 0;
    host.innerHTML = Object.keys(S.locations).map(function (id) {
      var l = S.locations[id];
      var here = id === S.location;
      var linked = S.locations[S.location].links.indexOf(id) !== -1;
      var actionable = !here && linked && canMove;
      return '<div class="loc' + (here ? " is-here" : "") + (linked && !here ? " is-linked" : "") + '">' +
        (here ? '<span class="loc__badge">Here</span>' : "") +
        '<h4 class="loc__name">' + l.name + "</h4>" +
        '<div class="loc__meta"><span class="loc__shroud">Shroud ' + l.shroud + '</span><span class="loc__clues">' + l.clues + " clues</span></div>" +
        (here
          ? '<button class="sim-btn sim-btn--sm" data-loc-investigate' + (S.actions <= 0 || l.clues <= 0 ? " disabled" : "") + ">Investigate (1 action)</button>"
          : linked
            ? '<button class="sim-btn sim-btn--sm sim-btn--ghost" data-loc-move="' + id + '"' + (actionable ? "" : " disabled") + ">Move here (1 action)</button>"
            : '<span class="loc__far">Not connected</span>') +
        "</div>";
    }).join("");

    host.querySelectorAll("[data-loc-investigate]").forEach(function (b) { b.addEventListener("click", actInvestigate); });
    host.querySelectorAll("[data-loc-move]").forEach(function (b) {
      b.addEventListener("click", function () { actMove(b.getAttribute("data-loc-move")); });
    });
  }

  function renderEnemies() {
    var host = root.querySelector("[data-sim-enemies]");
    var hint = root.querySelector("[data-sim-enemy-hint]");
    if (S.enemies.length === 0) {
      hint.textContent = "";
      host.innerHTML = '<p class="sim-empty">No enemies in play. Enjoy it while it lasts.</p>';
      return;
    }
    hint.textContent = S.enemies.length + " in play";
    var canAct = S.phase === "investigation" && S.actions > 0;
    host.innerHTML = S.enemies.map(function (e) {
      var engaged = e.at === S.location;
      return '<div class="enemy' + (engaged ? " is-engaged" : "") + '">' +
        '<div class="enemy__head"><h4>' + e.name + (e.elite ? '<span class="enemy__elite">Elite</span>' : "") + "</h4>" +
        '<span class="enemy__where">' + (engaged ? "Engaged with you" : "In the " + S.locations[e.at].name) + "</span></div>" +
        bar(Math.max(e.hp, 0), e.hpMax, "ehp") +
        '<div class="enemy__stats"><span>HP ' + Math.max(e.hp, 0) + "/" + e.hpMax + "</span><span>Fight " + e.fight + "</span><span>Evade " + e.evade + "</span><span>Dmg " + e.dmg + "</span><span>Horror " + e.horror + "</span></div>" +
        (engaged
          ? '<div class="enemy__btns"><button class="sim-btn sim-btn--sm sim-btn--blood" data-enemy-fight="' + e.uid + '"' + (canAct ? "" : " disabled") + ">Fight (1)</button>" +
            '<button class="sim-btn sim-btn--sm sim-btn--ghost" data-enemy-evade="' + e.uid + '"' + (canAct ? "" : " disabled") + ">Evade (1)</button></div>"
          : '<p class="enemy__wait">Not engaged. It moves closer in the enemy phase.</p>') +
        "</div>";
    }).join("");

    host.querySelectorAll("[data-enemy-fight]").forEach(function (b) {
      b.addEventListener("click", function () { actFight(findEnemy(b.getAttribute("data-enemy-fight"))); });
    });
    host.querySelectorAll("[data-enemy-evade]").forEach(function (b) {
      b.addEventListener("click", function () { actEvade(findEnemy(b.getAttribute("data-enemy-evade"))); });
    });
  }

  function findEnemy(id) { return S.enemies.filter(function (e) { return e.uid === id; })[0]; }

  function renderHand() {
    var host = root.querySelector("[data-sim-hand]");
    var hint = root.querySelector("[data-sim-hand-hint]");
    hint.textContent = S.hand.length + " cards";
    var canAct = S.phase === "investigation" && S.actions > 0;
    if (S.hand.length === 0) { host.innerHTML = '<p class="sim-empty">Your hand is empty.</p>'; return; }
    host.innerHTML = S.hand.map(function (c) {
      var playable = c.type !== "skill" && canAct && S.resources >= c.cost;
      var costStr = c.type === "skill" ? "Commit only" : "Cost " + c.cost;
      return '<div class="handcard handcard--' + c.type + '">' +
        '<span class="handcard__type">' + c.type + "</span>" +
        '<h4 class="handcard__name">' + c.name + "</h4>" +
        '<p class="handcard__text">' + c.text + "</p>" +
        '<div class="handcard__foot"><span class="handcard__cost">' + costStr + "</span>" +
        (c.type === "skill"
          ? '<span class="handcard__note">For tests</span>'
          : '<button class="sim-btn sim-btn--sm" data-play="' + c.uid + '"' + (playable ? "" : " disabled") + ">Play (1)</button>") +
        "</div></div>";
    }).join("");

    host.querySelectorAll("[data-play]").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = S.hand.filter(function (c) { return c.uid === b.getAttribute("data-play"); })[0];
        if (card) actPlay(card);
      });
    });
  }

  function renderStory() {
    var host = root.querySelector("[data-sim-story]");
    var ag = AGENDAS[S.agendaIndex];
    var pips = "";
    for (var i = 0; i < ag.threshold; i++) pips += '<i class="doompip' + (i < S.doom ? " is-on" : "") + '"></i>';
    host.innerHTML =
      '<div class="storycard">' +
        '<p class="storycard__tag">Act 1 · The House</p>' +
        '<p class="storycard__text">Spend 2 clues in the Hallway to advance.</p>' +
        '<div class="storycard__prog">Clues ready: <b>' + S.clues + " / 2</b></div>" +
      "</div>" +
      '<div class="storycard storycard--doom">' +
        '<p class="storycard__tag">' + ag.name + "</p>" +
        '<p class="storycard__text">Doom threshold ' + ag.threshold + ".</p>" +
        '<div class="doompips">' + pips + "<span>" + S.doom + " / " + ag.threshold + " doom</span></div>" +
      "</div>";
  }

  function renderLog() {
    var host = root.querySelector("[data-sim-log]");
    host.innerHTML = S.log.map(function (l) {
      return '<p class="simlog' + (l.tone ? " is-" + l.tone : "") + '">' + l.text + "</p>";
    }).join("");
  }

  function renderControls() {
    var host = root.querySelector("[data-sim-controls]");
    if (S.test) {
      host.innerHTML = '<p class="sim__hint sim__hint--center">Resolve the skill test above to continue.</p>';
      return;
    }
    if (S.status === "won" || S.status === "lost") {
      host.innerHTML =
        '<div class="sim-end sim-end--' + S.status + '">' +
          "<h3>" + (S.status === "won" ? "You advanced the Act!" : "Defeated") + "</h3>" +
          "<p>" + (S.status === "won"
            ? "Roland spent his clues and pushed the story forward. That is a round, played correctly."
            : S.loseReason + " It happens constantly. Try again with tighter action discipline.") + "</p>" +
          '<button class="sim-btn sim-btn--primary" data-sim-restart>Play again</button>' +
        "</div>";
      host.querySelector("[data-sim-restart]").addEventListener("click", function () { initState(); });
      return;
    }

    var html = "";
    if (S.phase === "mythos") {
      html = '<button class="sim-btn sim-btn--primary" data-sim-encounter>Draw your encounter card</button>';
    } else if (S.phase === "investigation") {
      var canAdvance = S.clues >= 2 && S.location === "hallway";
      html =
        '<button class="sim-btn sim-btn--ghost" data-sim-drawcard' + (S.actions <= 0 ? " disabled" : "") + ">Draw a card (1)</button>" +
        '<button class="sim-btn sim-btn--ghost" data-sim-resource' + (S.actions <= 0 ? " disabled" : "") + ">Take a resource (1)</button>" +
        (canAdvance ? '<button class="sim-btn sim-btn--primary" data-sim-advance>Advance the Act</button>' : "") +
        '<button class="sim-btn sim-btn--primary sim-btn--end" data-sim-endturn>End turn' + (S.actions > 0 ? " (" + S.actions + " left)" : "") + "</button>";
    } else if (S.phase === "enemy") {
      html = '<button class="sim-btn sim-btn--blood" data-sim-enemyphase>Resolve the enemy phase</button>';
    } else if (S.phase === "upkeep") {
      html = '<button class="sim-btn sim-btn--primary" data-sim-endround>End the round</button>';
    }
    host.innerHTML = html;

    var enc = host.querySelector("[data-sim-encounter]");
    if (enc) enc.addEventListener("click", resolveEncounter);
    var dc = host.querySelector("[data-sim-drawcard]");
    if (dc) dc.addEventListener("click", actDrawCard);
    var rs = host.querySelector("[data-sim-resource]");
    if (rs) rs.addEventListener("click", actResource);
    var adv = host.querySelector("[data-sim-advance]");
    if (adv) adv.addEventListener("click", actAdvance);
    var et = host.querySelector("[data-sim-endturn]");
    if (et) et.addEventListener("click", endTurn);
    var ep = host.querySelector("[data-sim-enemyphase]");
    if (ep) ep.addEventListener("click", resolveEnemyPhase);
    var er = host.querySelector("[data-sim-endround]");
    if (er) er.addEventListener("click", endRound);
  }

  function renderTest() {
    var host = root.querySelector("[data-sim-test]");
    var t = S.test;
    if (!t) { host.hidden = true; host.innerHTML = ""; return; }
    host.hidden = false;

    var commitOptions = S.hand.filter(function (c) {
      return c.type === "skill" && commitValue(c, t.skill) > 0;
    });

    var commitSum = t.commits.reduce(function (n, c) { return n + commitValue(c, t.skill); }, 0);

    if (t.stage === "commit") {
      host.innerHTML =
        '<div class="sim-test__card">' +
          '<p class="sim-test__kicker">Skill test · ' + SKILL_NAME[t.skill] + "</p>" +
          '<h3 class="sim-test__title">' + t.label + "</h3>" +
          '<div class="sim-test__nums">' +
            '<span>Base <b>' + t.base + "</b></span>" +
            '<span>Committed <b>+' + commitSum + "</b></span>" +
            '<span>Difficulty <b>' + t.diff + "</b></span>" +
          "</div>" +
          (commitOptions.length
            ? '<p class="sim-test__label">Commit skill cards from your hand (optional)</p><div class="sim-test__commits">' +
              commitOptions.map(function (c) {
                var on = t.commits.indexOf(c) !== -1;
                return '<button class="sim-commit' + (on ? " is-on" : "") + '" data-sim-commit="' + c.uid + '">' +
                  '<span>' + c.name + "</span><b>+" + commitValue(c, t.skill) + "</b></button>";
              }).join("") + "</div>"
            : '<p class="sim-test__label">No skill cards to commit. Commit more of them in a real deck.</p>') +
          '<button class="sim-btn sim-btn--primary" data-test-reveal>Reveal a chaos token</button>' +
        "</div>";

      host.querySelectorAll("[data-sim-commit]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-sim-commit");
          var card = S.hand.filter(function (c) { return c.uid === id; })[0];
          var idx = t.commits.indexOf(card);
          if (idx === -1) t.commits.push(card); else t.commits.splice(idx, 1);
          renderTest();
        });
      });
      host.querySelector("[data-test-reveal]").addEventListener("click", revealToken);
    } else {
      var cls = t.success ? "is-win" : "is-lose";
      host.innerHTML =
        '<div class="sim-test__card ' + cls + '">' +
          '<p class="sim-test__kicker">' + t.label + "</p>" +
          '<div class="sim-test__token">' + t.token.label + "</div>" +
          '<div class="sim-test__nums">' +
            '<span>Base <b>' + t.base + "</b></span>" +
            '<span>Committed <b>+' + t.commitSum + "</b></span>" +
            '<span>Total <b>' + (t.token.kind === "auto" ? "Auto-Fail" : t.total) + "</b></span>" +
            '<span>vs Difficulty <b>' + t.diff + "</b></span>" +
          "</div>" +
          '<p class="sim-test__verdict">' + (t.token.kind === "auto"
            ? "The Auto-Fail. The test fails no matter what."
            : t.success
              ? "Success. The total meets or beats the difficulty."
              : "Failure. The total is short of the difficulty.") + "</p>" +
          '<button class="sim-btn sim-btn--primary" data-test-done>Continue</button>' +
        "</div>";
      host.querySelector("[data-test-done]").addEventListener("click", closeTest);
    }
  }

  /* ============ boot ============ */
  initState();
  render();
  renderTest();
  log("Setup is done. Roland is in the Study with 5 resources and a hand of 5.", "");
  renderLog();
})();
