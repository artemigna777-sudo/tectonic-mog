// Земля трясётся 🤲 67 — логика игры, звуки и пасхалки
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим */ } }
  };

  // ───────── Тексты ─────────
  const GOOD = ["Ты замогал этот вопрос", "Я тебя могну 😤", "Фа, втфа!", "Сигма-ответ 🗿", "Котость 🐱", "Погнали, Вась!"];
  const BAD = ["Да ты шуешь!", "Ларп раскрыт 🎭", "Можно было, а зачем?", "Вась, а Вась?..", "Земля ушла из-под ног"];
  const COMBO = { 3: "Фа, втфа, пепе, шнейне 🔥", 5: "Ты могнул тектонические плиты", 10: "Гигачад-серия 🗿" };
  const RANKS = [
    [15, "Sub5 по геологии 🪨", "Камни и то больше знают. Но всё поправимо — жми «Ещё раз»!"],
    [30, "LTN — Low Tier Normie 🧍", "База есть, но плиты пока сильнее тебя."],
    [45, "MTN — Mid Tier Normie 😐", "Средненько трясёт. Подтяни правила поведения!"],
    [60, "HTN — High Tier Normie 🙂", "Уже неплохо — МЧС одобрительно кивает."],
    [75, "Chadlite сейсмологии 😎", "Почти chad. Ещё пара тем — и ты могнёшь литосферу."],
    [90, "Chad тектоники 🗿", "Тектоника тебе по плечу. Сигма-результат 🗿"],
    [99, "Гигачад МЧС 💪", "Хоть сейчас в спасатели. Почти идеально!"],
    [100, "True Adam литосферы 👑", "Ты знаешь всё. Земля трясётся — ты нет."]
  ];
  const rankIndex = (p) => {
    if (p >= 100) return 7;
    for (let i = 0; i < 7; i++) if (p <= RANKS[i][0]) return i;
    return 6;
  };
  const percent = (ok, total) => (total === 0 ? 0 : ok === total ? 100 : Math.floor((ok / total) * 100));

  // ───────── Звук (Web Audio) ─────────
  let soundOn = store.get("zt67-sound", true);
  let ac = null;
  function audio() {
    if (!soundOn) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function beep(freq = 660, dur = 0.12, type = "square", vol = 0.06, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function rumble(dur = 1) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 110;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t); src.stop(t + dur);
    const o = a.createOscillator(), g2 = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(50, t);
    o.frequency.linearRampToValueAtTime(28, t + dur);
    g2.gain.setValueAtTime(0.25, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g2).connect(a.destination);
    o.start(t); o.stop(t + dur);
  }
  const sfx = {
    ok() { beep(660, 0.09); beep(990, 0.14, "square", 0.06, 0.09); },
    bad() { beep(170, 0.3, "sawtooth", 0.06); rumble(0.6); },
    combo() { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.1, "triangle", 0.07, i * 0.07)); },
    egg() { beep(880, 0.08, "square", 0.05); beep(1320, 0.12, "square", 0.05, 0.08); }
  };
  function renderSound() {
    const b = $("soundBtn");
    b.textContent = soundOn ? "🔊" : "🔇";
    b.setAttribute("aria-pressed", String(soundOn));
    b.setAttribute("aria-label", soundOn ? "Выключить звук" : "Включить звук");
  }

  // ───────── Эффекты ─────────
  const fx = $("fx");
  function particle(text, cls, style, life) {
    const s = document.createElement("span");
    s.className = "p " + cls;
    s.textContent = text;
    Object.assign(s.style, style);
    fx.appendChild(s);
    setTimeout(() => s.remove(), life);
    return s;
  }
  function burst(emojis, n, x, y, spread = 170) {
    for (let i = 0; i < n; i++) {
      const dur = rnd(0.8, 1.3);
      particle(pick(emojis), "burst", {
        left: x + "px", top: y + "px",
        "--dx": rnd(-spread, spread).toFixed(0) + "px",
        "--dy": rnd(-spread * 1.3, spread * 0.3).toFixed(0) + "px",
        "--rot": rnd(-360, 360).toFixed(0) + "deg",
        "--dur": dur + "s"
      }, dur * 1000 + 100);
    }
  }
  function rain(emojis, n) {
    for (let i = 0; i < n; i++) {
      const dur = rnd(2.4, 4.4), delay = rnd(0, 1.6);
      const style = {
        left: rnd(0, 96) + "vw",
        "--dur": dur + "s", "--dx": rnd(-60, 60).toFixed(0) + "px",
        "--rot": rnd(-540, 540).toFixed(0) + "deg",
        animationDelay: delay + "s", fontSize: rnd(26, 44).toFixed(0) + "px"
      };
      if (reduced()) style.top = rnd(5, 85) + "vh";
      particle(pick(emojis), "fall", style, (dur + delay) * 1000 + 200);
    }
  }
  let quakeTimer = 0;
  function quake(ms) {
    document.body.classList.add("shake");
    clearTimeout(quakeTimer);
    quakeTimer = setTimeout(() => document.body.classList.remove("shake"), ms);
  }
  function toast(text, ms = 2600) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    $("toasts").appendChild(t);
    setTimeout(() => t.classList.add("out"), ms);
    setTimeout(() => t.remove(), ms + 450);
  }
  function overlay(html, ms, clickable) {
    const o = document.createElement("div");
    o.className = "ovl";
    o.innerHTML = html;
    document.body.appendChild(o);
    let done = false;
    const close = () => {
      if (done) return; done = true;
      o.classList.add("out");
      setTimeout(() => o.remove(), 420);
    };
    if (clickable) { o.style.pointerEvents = "auto"; o.addEventListener("click", close); }
    setTimeout(close, ms);
    return close;
  }
  function center(el) {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  // ───────── Сейсмограмма на старте ─────────
  let seisTimer = 0, seisT = 0;
  function seisFrame() {
    seisT++;
    let d = "M0 60";
    for (let x = 6; x <= 600; x += 6) {
      const env = Math.sin((x / 600) * Math.PI) * (0.35 + 0.65 * Math.abs(Math.sin(seisT / 14 + x / 80)));
      const amp = Math.random() < 0.07 ? 52 : 20;
      d += ` L${x} ${(60 + (Math.random() * 2 - 1) * amp * env).toFixed(1)}`;
    }
    $("startPath").setAttribute("d", d);
  }
  function startSeis() {
    clearInterval(seisTimer);
    seisFrame();
    if (!reduced()) seisTimer = setInterval(seisFrame, 90);
  }
  const stopSeis = () => clearInterval(seisTimer);

  // ───────── Состояние игры ─────────
  let deck = [], idx = 0, score = 0, combo = 0, maxCombo = 0, correctCount = 0;
  let wrongStreak = 0, answered = false, startTime = 0, score67 = false, kbd = false;
  let prog = [];

  function buildDeck() {
    return shuffle(QUESTIONS.map((q) => {
      const opts = shuffle(q.a.map((t, i) => ({ t, ok: i === q.correct })));
      return { q: q.q, a: opts.map((o) => o.t), correct: opts.findIndex((o) => o.ok), fact: q.fact };
    }));
  }

  function show(id) {
    ["start", "game", "final"].forEach((s) => { $(s).hidden = s !== id; });
    const inGame = id === "game";
    $("score").hidden = !inGame;
    if (!inGame) $("combo").hidden = true;
    if (id === "start") startSeis(); else stopSeis();
    window.scrollTo(0, 0);
  }

  function updateHud() {
    $("score").textContent = score + " очк.";
    const c = $("combo");
    if (combo >= 2) {
      c.hidden = false;
      c.textContent = "🔥 x" + Math.min(combo, 5);
      c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
    } else c.hidden = true;
    $("streakInfo").textContent = combo >= 2 ? "серия: " + combo : "";
  }

  function drawProg() {
    $("progLine").setAttribute("points", prog.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "));
  }
  function addProg(ok) {
    const n = deck.length, x0 = (idx / n) * 1000, w = 1000 / n;
    const shape = ok
      ? [[0.33, -3], [0.66, 3], [1, 0]]
      : [[0.15, -32], [0.35, 34], [0.55, -24], [0.75, 14], [0.9, -6], [1, 0]];
    shape.forEach(([k, dy]) => prog.push([x0 + w * k, 40 + dy]));
    drawProg();
  }

  function startGame() {
    deck = buildDeck();
    idx = 0; score = 0; combo = 0; maxCombo = 0; correctCount = 0; wrongStreak = 0; score67 = false;
    prog = [[0, 40]];
    drawProg();
    startTime = Date.now();
    $("tiger").hidden = true;
    show("game");
    updateHud();
    render();
  }

  function render() {
    const item = deck[idx];
    answered = false;
    $("counter").textContent = `Вопрос ${idx + 1} / ${deck.length}`;
    $("question").textContent = item.q;
    const box = $("answers");
    box.innerHTML = "";
    item.a.forEach((t, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ans";
      b.innerHTML = `<span class="key">${i + 1}</span><span class="txt"></span>`;
      b.querySelector(".txt").textContent = t;
      b.addEventListener("click", () => answer(i));
      box.appendChild(b);
    });
    $("feedback").hidden = true;
    $("crack").classList.remove("show");
    $("card").classList.remove("ok");
    if (kbd) box.firstChild.focus({ preventScroll: true });
  }

  function crack() {
    let x = rnd(90, 310), y = 0;
    const pts = [[x, y]];
    const steps = 9;
    for (let i = 1; i <= steps; i++) {
      y = (300 / steps) * i;
      x = Math.min(395, Math.max(5, x + rnd(-45, 45)));
      pts.push([x, y]);
    }
    const svg = $("crack");
    $("crackLine").setAttribute("points", pts.map((p) => p.join(",")).join(" "));
    svg.classList.remove("show"); void svg.getBoundingClientRect(); svg.classList.add("show");
  }

  function answer(i) {
    if (answered) return;
    answered = true;
    const item = deck[idx];
    const btns = [...$("answers").children];
    btns.forEach((b, j) => {
      b.disabled = true;
      if (j === item.correct) b.classList.add("correct");
      else if (j === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });
    const r = $("reaction");
    const ok = i === item.correct;
    if (ok) {
      correctCount++; combo++; wrongStreak = 0;
      maxCombo = Math.max(maxCombo, combo);
      const mult = Math.min(combo, 5);
      score += mult;
      r.textContent = COMBO[combo] || pick(GOOD);
      r.className = "reaction good";
      const card = $("card");
      card.classList.remove("ok"); void card.offsetWidth; card.classList.add("ok");
      const [x, y] = center(btns[i]);
      burst(["🪨", "💎", "🌋"], 14, x, y);
      particle("+" + mult, "burst", {
        left: x + "px", top: y - 20 + "px", "--dx": "0px", "--dy": "-90px", "--rot": "0deg", "--dur": "1s",
        fontFamily: "var(--font-h)", fontWeight: "800", color: "var(--ok)"
      }, 1100);
      if (COMBO[combo]) { sfx.combo(); toast("🔥 x" + mult + " — " + COMBO[combo]); }
      else sfx.ok();
      addProg(true);
      if (score === 67 && !score67) { score67 = true; setTimeout(() => toast("Сикс-севен детектед 🤲"), 500); }
    } else {
      combo = 0; wrongStreak++;
      const mirrors = item.a[i] === "Обогрев межбоковых зеркал";
      r.textContent = mirrors ? "Нигде в мире такого нет 🚗" : pick(BAD);
      r.className = "reaction bad";
      quake(600);
      crack();
      sfx.bad();
      addProg(false);
      if (wrongStreak === 3) penguin();
    }
    updateHud();
    $("fact").textContent = item.fact;
    $("feedback").hidden = false;
    $("nextBtn").textContent = idx === deck.length - 1 ? "К итогам 🏁" : "Дальше →";
    if (kbd) $("nextBtn").focus({ preventScroll: true });
    $("feedback").scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
  }

  function next() {
    if (!answered) return;
    idx++;
    if (idx >= deck.length) finish(); else render();
  }

  function finish() {
    const total = deck.length;
    const secs = Math.round((Date.now() - startTime) / 1000);
    const pct = percent(correctCount, total);
    const ri = rankIndex(pct);
    $("fScore").textContent = score;
    $("fPct").textContent = `${correctCount} из ${total} — ${pct}% · время ${secs} с · макс. комбо 🔥${maxCombo}`;
    $("fRank").textContent = RANKS[ri][1];
    $("fPhrase").textContent = RANKS[ri][2];
    const best = store.get("zt67-best", null);
    if (!best || score > best.score) {
      store.set("zt67-best", { score, pct });
      $("fBest").textContent = best ? "Новый рекорд! 🏆" : "Первый рекорд записан 🏆";
    } else {
      $("fBest").textContent = `Рекорд: ${best.score} очк. (${best.pct}%)`;
    }
    $("tiger").hidden = pct >= 30;
    show("final");
    if (pct >= 76) rain(["🪨", "💎", "🌋", "👑"], 40);
    if (score === 67 || secs === 67) setTimeout(() => toast("Сикс-севен детектед 🤲"), 600);
    lastResult = { score, pct, total, correct: correctCount, rank: RANKS[ri][1], maxCombo };
  }
  let lastResult = null;

  function renderBest() {
    const best = store.get("zt67-best", null);
    $("best").textContent = best ? `Твой рекорд: ${best.score} очк. (${best.pct}%)` : "";
  }

  async function share() {
    if (!lastResult) return;
    const r = lastResult;
    const text = `Земля трясётся 🤲 67: ${r.score} очк., ${r.correct}/${r.total} (${r.pct}%). ` +
      `Звание: ${r.rank}. Макс. комбо 🔥${r.maxCombo}. Сможешь лучше? ${location.href}`;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch (e2) { ok = false; }
    }
    toast(ok ? "Результат скопирован — кидай друзьям 📋" : "Не вышло скопировать 😢");
  }

  // ───────── Пасхалки ─────────
  const titleEl = $("title");
  const titleHTML = titleEl.innerHTML;

  function sixSeven() {
    overlay(`<div class="hands"><span>🤲</span><span>🤲</span></div>
      <div class="big-text">SIX… SEVEN!</div><div class="mid-text">Магнитуда 6.7</div>`, 2200);
    quake(1500);
    rumble(1.5);
    beep(600, 0.18, "square", 0.06, 0.1);
    beep(700, 0.25, "square", 0.06, 0.55);
  }

  function larp() {
    const on = document.body.classList.toggle("larp");
    titleEl.textContent = on ? "Я точно геолог" : "";
    if (!on) titleEl.innerHTML = titleHTML;
    toast(on ? "🎭 LARP MODE" : "🎭 Ларп окончен");
  }

  function chad() {
    const on = document.body.classList.toggle("chad");
    const old = document.querySelector(".moai");
    if (old) old.remove();
    if (on) {
      const m = document.createElement("div");
      m.className = "moai"; m.textContent = "🗿"; m.setAttribute("aria-hidden", "true");
      document.body.appendChild(m);
    }
    toast(on ? "🗿 Гигачад-режим: доверяй" : "🗿 Гигачад ушёл в закат");
  }

  function tierList() {
    let answeredN = 0;
    if (!$("game").hidden) answeredN = idx + (answered ? 1 : 0);
    else if (!$("final").hidden && lastResult) answeredN = lastResult.total;
    const pct = percent(correctCount, answeredN);
    const me = rankIndex(pct);
    const items = RANKS.map((r, i) => `<li class="${i === me ? "me" : ""}">${r[1]}</li>`).reverse().join("");
    overlay(`<div class="tier"><h3>Тир-лист тектоники</h3><ol>${items}</ol>
      <p>Сейчас у тебя ${pct}% верных. Тапни, чтобы закрыть.</p></div>`, 7000, true);
  }

  function mog() {
    overlay(`<div class="big-text">Я тебя могну</div>`, 2600);
    const v = document.createElement("div");
    v.className = "volcano"; v.textContent = "🌋";
    document.body.appendChild(v);
    rumble(0.9);
    const [x, y] = center(v);
    [0, 350, 700, 1050].forEach((d) => setTimeout(() => burst(["😤"], 8, x, y - 30, 220), d));
    setTimeout(() => v.remove(), 2700);
  }

  function vas() {
    if (document.querySelector(".vas")) return;
    const el = document.createElement("div");
    el.className = "vas";
    el.innerHTML = "<b>👀</b><span>Вась, а Вась?</span>";
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    setTimeout(() => { el.querySelector("b").textContent = "🏃"; el.querySelector("span").textContent = "Погнали, Вась!"; beep(700, 0.1); }, 1300);
    setTimeout(() => el.classList.remove("in"), 2800);
    setTimeout(() => el.remove(), 3400);
  }

  function penguin() {
    if (document.querySelector(".peng")) return;
    const m = document.createElement("div");
    m.className = "mountain"; m.textContent = "🏔️";
    const p = document.createElement("div");
    p.className = "walker peng";
    p.innerHTML = "<small>Иду в горы. Там хотя бы нет сейсмоактивности… наверное</small>🐧";
    document.body.append(m, p);
    setTimeout(() => { p.remove(); m.remove(); }, 14500);
  }

  function retro() {
    const on = document.body.classList.toggle("retro");
    toast(on ? "📼 Мой 2016" : "📼 Вернулись в настоящее");
  }

  function cheremsha() {
    rain(["🦁", "🐰"], 34);
    toast("🌿 Режим «Черемша»: гибрид льва и зайца одобряет", 3500);
  }

  function air() {
    const on = document.body.classList.toggle("air");
    toast(on ? "🎈 Режим «Воздухан»" : "🎈 Приземлились");
  }

  function kotost() {
    const cat = document.createElement("div");
    cat.className = "walker cat"; cat.textContent = "🐱";
    document.body.appendChild(cat);
    const dur = 3500, stepMs = 140, top = innerHeight * 0.55 - 10;
    let n = 0;
    const timer = setInterval(() => {
      n++;
      const t = (n * stepMs) / dur;
      if (t > 1) { clearInterval(timer); return; }
      const paw = document.createElement("span");
      paw.className = "paw"; paw.textContent = "🐾";
      paw.style.left = (reduced() ? innerWidth * 0.4 : t * (innerWidth + 160) - 80) + (reduced() ? n * 12 : 0) + "px";
      paw.style.top = top + (n % 2 ? -12 : 12) + "px";
      paw.style.transform = "rotate(90deg)";
      document.body.appendChild(paw);
      setTimeout(() => paw.remove(), 3100);
    }, stepMs);
    setTimeout(() => cat.remove(), dur + 200);
    beep(1200, 0.06, "triangle", 0.05); beep(1500, 0.08, "triangle", 0.05, 0.1);
  }

  let logoClicks = 0, logoTimer = 0;
  function logoClick() {
    logoClicks++;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 1500);
    if (logoClicks >= 5) {
      logoClicks = 0;
      const l = $("logo");
      l.classList.remove("flip"); void l.offsetWidth; l.classList.add("flip");
      setTimeout(() => l.classList.remove("flip"), 900);
      toast("Можно, а зачем?");
      sfx.egg();
    }
  }

  // Коды: длинные раньше коротких
  const CODES = [
    [["chadlite", "mtn", "htn", "ltn"], tierList],
    [["котость"], kotost],
    [["воздух"], air],
    [["могну", "mog"], mog],
    [["larp", "ларп"], larp],
    [["2016"], retro],
    [["вась", "vas"], vas],
    [["chad", "чад"], chad],
    [["67"], sixSeven]
  ];
  const EXTRA = { konami: cheremsha, cheremsha: cheremsha, "черемша": cheremsha };

  function runEgg(fn) { sfx.egg(); fn(); }

  // Ввод с клавиатуры: буфер по символам и по физическим клавишам (работает при любой раскладке)
  let bufKey = "", bufCode = "", chadPending = 0;
  function codeChar(e) {
    const c = e.code || "";
    if (c.startsWith("Key")) return c.slice(3).toLowerCase();
    if (c.startsWith("Digit")) return c.slice(5);
    if (c.startsWith("Numpad") && /\d$/.test(c)) return c.slice(-1);
    return "";
  }
  function typed(e) {
    if (e.key.length !== 1) return;
    bufKey = (bufKey + e.key.toLowerCase()).slice(-10);
    bufCode = (bufCode + codeChar(e)).slice(-10);
    const ends = (w) => bufKey.endsWith(w) || bufCode.endsWith(w);
    if (chadPending && ["chadl", "chadli", "chadlit"].some(ends)) { clearTimeout(chadPending); chadPending = 0; }
    for (const [words, fn] of CODES) {
      if (!words.some(ends)) continue;
      if (fn === chad && ends("chad")) {
        // ждём: вдруг это начало «chadlite»
        clearTimeout(chadPending);
        chadPending = setTimeout(() => { chadPending = 0; runEgg(chad); }, 700);
        return;
      }
      bufKey = ""; bufCode = "";
      runEgg(fn);
      return;
    }
  }

  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kIdx = 0;
  function konami(e) {
    const k = e.key.length === 1 ? (codeChar(e) || e.key.toLowerCase()) : e.key;
    if (k === KONAMI[kIdx]) kIdx++;
    else kIdx = k === KONAMI[0] ? 1 : 0;
    if (kIdx === KONAMI.length) { kIdx = 0; runEgg(cheremsha); }
  }

  // ───────── События ─────────
  document.addEventListener("pointerdown", () => { kbd = false; });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    kbd = true;
    if (e.target.closest && e.target.closest("dialog, input, textarea")) return;
    konami(e);
    const onButton = e.target.tagName === "BUTTON";
    if (!$("game").hidden) {
      if (!answered && /^[1-4]$/.test(e.key)) answer(Number(e.key) - 1);
      else if (answered && e.key === "Enter" && !onButton) { e.preventDefault(); next(); }
    } else if (!$("start").hidden && e.key === "Enter" && !onButton) {
      e.preventDefault(); startGame();
    }
    typed(e);
  });

  $("playBtn").addEventListener("click", startGame);
  $("nextBtn").addEventListener("click", next);
  $("againBtn").addEventListener("click", startGame);
  $("shareBtn").addEventListener("click", share);
  $("logo").addEventListener("click", logoClick);
  $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn;
    store.set("zt67-sound", soundOn);
    renderSound();
    if (soundOn) beep(660, 0.08);
  });

  const dlg = $("secretDlg"), input = $("secretInput");
  $("secretBtn").addEventListener("click", () => {
    input.value = "";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    input.focus();
  });
  const closeDlg = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
  $("secretClose").addEventListener("click", closeDlg);
  $("secretForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim().toLowerCase().replace(/\s+/g, "");
    let fn = EXTRA[v] || null;
    if (!fn) for (const [words, f] of CODES) if (words.includes(v)) { fn = f; break; }
    if (!fn) { toast("Такого кода нет… пока 🤔"); input.select(); return; }
    closeDlg();
    runEgg(fn);
  });

  // ───────── Старт ─────────
  renderSound();
  renderBest();
  show("start");
})();
