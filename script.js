/* ============================================================
   IELTS Daily — asosiy logika
   • Real-time soat + kalender (hafta kuni jadvalni boshqaradi)
   • Dushanba/Chorshanba/Juma/Yakshanba ertalab — daily routine.txt
   • Seshanba/Payshanba/Shanba — ertalabgi playlist + Listening S1–S4
   • Pomodoro: 25 daq dars (video bloklangan) + 5 daq tanafus (mashq video)
   • Lug'at: 2 ustun, Enter = yangi raqamli qator, Tab/2xSpace = narigi ustun,
     har 20 qatordan keyin 5 xil rangli random test (natijalar saqlanadi)
   ============================================================ */

const LB = "ieltsdaily_v1";
const MIN = 60 * 1000;

const UZ_DAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const UZ_MONTHS = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];

/* ---------------- holat (localStorage) ---------------- */
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(LB));
    if (s && typeof s === "object") return Object.assign(defaultState(), s);
  } catch (e) {}
  return defaultState();
}
function defaultState() {
  return {
    prepIdx: 0,            // ertalabgi playlistdan keyingi video
    prepDayDone: "",       // bugun prep ko'rilgan kun (YYYY-MM-DD)
    secQueue: 0,           // section videolari global ketma-ketligi (S1[0],S2[0],S3[0],S4[0],S1[1]...)
    secWatched: [[], [], [], []],  // har sectionda ko'rilgan video id-lari
    targetIdx: 0,          // TARGET playlistdan keyingi video
    targetLastDate: "",    // bugun target ko'rilgan kun
    notebook: [""],        // daftar sahifalari (har boshqa qog'oz)
    notebookSpread: 0,     // ochiq turgan sahifa juftligi
    breakIdx: 0,
    vocab: [],             // [{w:"", t:""}]
    testResults: {},       // "z0-t2": {score,total,ts}
    pom: null              // {mode:"lesson"|"break", end:ms, title, id, kind, col, idx}
  };
}
const state = loadState();
function saveState() { localStorage.setItem(LB, JSON.stringify(state)); }

/* ---------------- helperlar ---------------- */
const $ = (id) => document.getElementById(id);
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function ytId(v) {
  if (!v) return "";
  v = String(v).trim();
  if (/^[\w-]{6,15}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,15})/);
  return m ? m[1] : "";
}
function pad(n) { return String(n).padStart(2, "0"); }
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}

/* ---------------- video manbalar ---------------- */
const V = window.SITE_VIDEOS || {};
const SECTIONS = [V.SECTION_1, V.SECTION_2, V.SECTION_3, V.SECTION_4].map(a => (a || []).map(ytId).filter(Boolean));
const PREPS = (V.PREP_VIDEOS || []).map(ytId).filter(Boolean);
const TARGETS = (V.TARGET_VIDEOS || []).map(ytId).filter(Boolean);

/* Round-robin generator: S1[i], S2[i], S3[i], S4[i], S1[i+1], ... */
function buildQueue() {
  const q = [];
  const maxLen = Math.max(0, ...SECTIONS.map(s => s.length));
  for (let i = 0; i < maxLen; i++) {
    for (let c = 0; c < 4; c++) {
      if (SECTIONS[c] && SECTIONS[c][i]) q.push({ kind: "section", col: c, idx: i, id: SECTIONS[c][i] });
    }
  }
  return q;
}
function sectionName(col) { return "Listening Section " + (col + 1); }

/* ---------------- daily routine.txt ---------------- */
const ROUTINE_URL = encodeURI("daily routine.txt");
let ROUTINE = null;
async function loadRoutine() {
  try {
    const r = await fetch(ROUTINE_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("fetch xato");
    return parseRoutine(await r.text());
  } catch (e) {
    return { error: "Fayl o'qilmadi (lokal fayl sifatida ochilsa brauzer fetch ruxsat bermaydi — GitHub Pages uchun ishlaydi)." };
  }
}
function parseRoutine(text) {
  const out = { dushanba: [], chorshanba: [], juma: [], yakshanba: [], seshanba: [], payshanba: [], shanba: [] };
  let cur = null;
  text.split(/\r?\n/).forEach(line => {
    const raw = line.trim();
    if (!raw) return;
    const dm = raw.match(/^\[(.+?)\]/);
    if (dm) {
      const key = dm[1].trim().toLowerCase().split(/\s+/)[0];
      cur = out[key] || null;
      return;
    }
    if (!cur) return;
    if (/^[*=]|^DIELS|^Qoida|^Fayl/i.test(raw)) return;
    const im = raw.match(/^(\d{1,2})[:.](\d{2})\s*[-–—]\s*(.+)$/);
    if (!im) return;
    const rest = im[3];
    const vid = ytId(rest);
    const name = vid ? rest.replace(/(https?:\/\/\S+)/g, "").replace(/[()]/g, "").trim() : rest;
    cur.push({ time: im[1] + ":" + im[2], name: name || "Dars", video: vid });
  });
  return out;
}

/* ----------------пании o'zgartirish ---------------- */
function showView(name) {
  ["plan", "lesson", "break", "vocab", "rewatch", "target"].forEach(v => {
    $("view-" + v).hidden = (v !== name);
  });
  const shortcut = $("vocabShortcut");
  if (shortcut) shortcut.hidden = (name === "vocab");
  if (name === "plan") renderPlan();
  window.scrollTo(0, 0);
}

/* ---------------- soat / kalender ---------------- */
function tickClock() {
  const d = new Date();
  $("bigClock").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  $("dateLine").textContent = `${d.getDate()}-${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()} yil`;
  const day = d.getDay();
  const badge = $("dayBadge");
  if (day === 2 || day === 4 || day === 6) {
    badge.textContent = UZ_DAYS[day] + " — Listening kuni 🎧";
  } else {
    badge.textContent = UZ_DAYS[day] + " — Daily routine kuni 📚";
  }
}

/* ---------------- REJA VIEW ---------------- */
async function renderPlan() {
  const d = new Date();
  const day = d.getDay();
  const isListening = (day === 2 || day === 4 || day === 6);
  const morning = d.getHours() < 12;
  let html = "";

  if (isListening) {
    html += `<div class="muted">🎧 <b>Seshanba/Payshanba/Shanba rejimi:</b> avval ertalabgi playlistdan 1 ta video, so'ng Listening Section 1→2→3→4 ketma-ket (butun playlist tugaguncha, har kuni davom etadi).</div>`;
    // 1) ertalabgi video — har kuni 1 ta
    const prep = PREPS;
    if (state.prepDayDone !== todayStr() && state.prepIdx < prep.length) {
      html += lessonItemHTML({
        title: "☀️ Ertalabgi video " + (state.prepIdx + 1) + "/" + prep.length,
        sub: "Har kuni 1 ta",
        id: prep[state.prepIdx],
        data: { kind: "prep", idx: state.prepIdx }
      });
    } else if (state.prepIdx < prep.length) {
      html += `<div class="lesson-item done"><div class="name">✅ Bugungi ertalabgi video ko'rildi</div><div class="sub">Keyingisi — keyingi listening kuni</div></div>`;
    } else {
      html += `<div class="lesson-item done"><div class="name">🎉 Ertalabgi playlist to'liq tugadi!</div></div>`;
    }
    // 2) keyingi section video
    const q = buildQueue();
    if (state.secQueue < q.length) {
      const it = q[state.secQueue];
      html += lessonItemHTML({
        title: "🎬 " + sectionName(it.col) + " — " + (it.idx + 1) + "-video",
        sub: "Video tugatib «Keyingi video» bosilsa, navbatdagi section ochiladi",
        id: it.id,
        data: { kind: "section", col: it.col, idx: it.idx, step: state.secQueue }
      });
    } else {
      html += `<div class="lesson-item done"><div class="name">🏆 Barcha Listening sectionlari tugadi! Qayta ko'rish bo'limida och.</div></div>`;
    }
    // 3) Target — har listening kuni 1 ta (listening + lug'at tugagach)
    if (TARGETS.length) {
      const doneTarget = state.targetLastDate === todayStr();
      const tIdx = Math.min(state.targetIdx, TARGETS.length - 1);
      html += `<div class="lesson-item ${doneTarget ? "done" : ""}">
        <div><div class="name">🎯 Target video ${tIdx + 1}/${TARGETS.length}</div><div class="sub">Listening + lug'at tugagach; har kuni faqat 1 ta</div></div>
        ${doneTarget ? `<span class="muted">✅ Bugun ko'rildi</span>` : `<button class="btn primary" data-target="1">Target ochish 🎯</button>`}
      </div>`;
    }
  } else {
    // Dushanba/Chorshanba/Juma/Yakshanba — routine + reading
    if (!ROUTINE) ROUTINE = await loadRoutine();
    if (ROUTINE.error) {
      html += `<div class="muted">⚠️ ${esc(ROUTINE.error)}</div>`;
    }
    const key = UZ_DAYS[day].toLowerCase();
    const items = (ROUTINE[key] || []);
    html += `<div class="muted">📚 <b>${UZ_DAYS[day]} rejimi:</b> "daily routine.txt" faylidagi ${UZ_DAYS[day].toLowerCase()} darslari${morning ? " (ertalab)" : ""}.</div>`;
    if (items.length === 0) {
      html += `<div class="muted">Faylda bu kun uchun hali dars yozilmagan. «daily routine.txt» faylini to'ldirib, GitHubga yuklang.</div>`;
    } else {
      items.forEach((it, i) => {
        const card = lessonItemHTML({
          title: "⏰ " + it.time + " — " + esc(it.name),
          sub: it.video ? "Videoli dars" : "Matnli dars",
          id: it.video,
          data: { kind: "routine", title: it.time + " — " + it.name }
        });
        html += it.video ? card : `<div class="lesson-item done"><div class="name">${esc(it.time + " — " + it.name)}</div><div class="sub">Boshqa o'qish vositasi</div></div>`;
      });
    }
    html += `<div class="lesson-item done"><div class="name">📖 Reading bo'limi</div><div class="sub">Keyinroq qo'shib turadi</div></div>`;
  }

  $("planBody").innerHTML = html;
  $("planBody").querySelectorAll("[data-start]").forEach(b => {
    b.onclick = () => startLesson(b.dataset);
  });
  $("planBody").querySelectorAll("[data-target]").forEach(b => {
    b.onclick = () => openTarget();
  });
  renderWatchedBox();
}

function lessonItemHTML(o) {
  const ds = o.data ? Object.entries(o.data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ") : "";
  return `<div class="lesson-item">
    <div><div class="name">${o.title}</div>${o.sub ? `<div class="sub">${esc(o.sub)}</div>` : ""}</div>
    ${o.id ? `<button class="btn primary" data-start="1" data-id="${o.id}" ${ds}>Darsni boshlash ▶</button>` : ""}
  </div>`;
}

function renderWatchedBox() {
  const total = SECTIONS.reduce((a, arr) => a + arr.length, 0);
  const watched = state.secWatched.reduce((a, arr) => a + arr.length, 0);
  let html = `<div class="plan-body">
    <div class="muted">🎧 Listening jadvali: <b>${watched}/${total}</b> video ko'rildi | ☀️ Ertalabgi playlist: <b>${Math.min(state.prepIdx, PREPS.length)}/${PREPS.length}</b></div>`;
  if (watched > 0) {
    html += `<div class="muted">Sectionlardan ko'rilganlar — «🔁 Qayta ko'rish» bo'limida chiqadi.</div>`;
  }
  html += `</div>`;
  $("watchedBox").innerHTML = html;
}

/* ---------------- POMODORO TIMER (burchak) ---------------- */
let timerInt = null;
function startPom(mode, minutes, info) {
  state.pom = Object.assign({ mode, end: Date.now() + minutes * MIN }, info || {});
  saveState();
  startTimerTicker();
}
function startTimerTicker() {
  if (timerInt) clearInterval(timerInt);
  timerInt = setInterval(tickTimer, 250);
  tickTimer();
}
function tickTimer() {
  const pom = state.pom;
  const el = $("cornerTimer");
  if (!pom) { el.hidden = true; if (timerInt) clearInterval(timerInt); timerInt = null; return; }
  el.hidden = false;
  const remain = pom.end - Date.now();
  const s = Math.max(0, Math.ceil(remain / 1000));
  $("ctLabel").textContent = pom.mode === "lesson" ? "DARS • 25 DAQ" : "TANAFUS • 5 DAQ";
  $("ctTime").textContent = pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  el.classList.toggle("break", pom.mode !== "lesson");
  if (pom.mode === "lesson" && remain <= 0 && !pom.toldTimeup) {
    pom.toldTimeup = true;
    saveState();
    if (pom.mode === "lesson") $("lessonMsg").textContent = "⏰ 25 daqiqa tugadi — video tugagach «Keyingi video» bosing.";
  }
  if (pom.mode === "break" && remain <= 0) {
    $("btnBreakDone").hidden = false;
    pom.doneShown = true;
  }
}

/* ---------------- DARS VIEW (bloklangan video) ---------------- */
let yt = null;
let watchdog = null;

async function startLesson(ds) {
  const id = ds.id || "";
  const kind = ds.kind || "section";
  const title =
    kind === "prep" ? "☀️ Ertalabgi video " + (Number(ds.idx) + 1) :
    kind === "section" ? sectionName(Number(ds.col)) + " — " + (Number(ds.idx) + 1) + "-video" :
    (ds.title || "Dars");
  startPom("lesson", 25, {
    id, kind, title,
    col: kind === "section" ? Number(ds.col) : "",
    idx: kind === "section" ? Number(ds.idx) : ""
  });
  showView("lesson");
  $("lessonTitle").textContent = title;
  $("lessonMsg").textContent = "⏱ 25 daqiqa timer ishga tushdi. Video nazorat ostida: pauza va surishta yo'q.";
  $("btnSwitchNext").hidden = true;
  buildLockedPlayer(id);
}

function buildLockedPlayer(id) {
  if (watchdog) { clearInterval(watchdog); watchdog = null; }
  if (yt) { try { yt.destroy(); } catch (e) {} yt = null; }
  const wrap = $("ytPlayer");
  wrap.innerHTML = "";
  const lockOverlay = $("videoLock");

  const installLock = () => {
    lockOverlay.oncontextmenu = (e) => e.preventDefault();
    wrap.oncontextmenu = (e) => e.preventDefault();
  };

  if (typeof YT === "undefined" || !YT.Player) {
    // API yuklanmadi — oddiy iframe, oyna bloklangan holida;
    // video tugagandan keyin ham tugma ko'rinadi.
    wrap.insertAdjacentHTML("beforeend",
      `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&controls=0&disablekb=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3"
      frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`);
    installLock();
    $("btnSwitchNext").hidden = false;
    return;
  }

  // YT.Player elementni iframe bilan almashtiradi — avval sich container qo'yamiz
  const holder = document.createElement("div");
  holder.id = "ytPlayer_inner";
  holder.style.position = "absolute";
  holder.style.inset = "0";
  wrap.appendChild(holder);

  yt = new YT.Player("ytPlayer_inner", {
    width: "100%", height: "100%",
    videoId: id,
    playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
    events: {
      onReady: (e) => { e.target.playVideo(); installLock(); },
      onStateChange: (e) => {
        const S = YT.PlayerState;
        if (e.data === S.ENDED) {
          $("lessonMsg").textContent = "✅ Video tugadi! «Keyingi video» bosing — keyin tanafus.";
          $("btnSwitchNext").hidden = false;
        } else if (e.data === S.PAUSED) {
          setTimeout(() => { try { yt && yt.playVideo(); } catch (err) {} }, 300);
        }
      },
      onError: () => { $("lessonMsg").textContent = "⚠️ Video ochilmadi — ID/link to'g'ri yozilganini tekshir."; }
    }
  });

  // Watchdog: pauza allaqachon qilsa ham 2 sekundda qayta ishga tushiramiz
  watchdog = setInterval(() => {
    if (!yt || !yt.getPlayerState) return;
    const st = yt.getPlayerState();
    if (st === 2 || st === 5) { try { yt.playVideo(); } catch (err) {} }
  }, 2000);
}

/* Keyingi video tugmasi: dars natijasi saqlanadi + tanafusga o't */
$("btnSwitchNext").onclick = () => {
  const pom = state.pom;
  if (pom && pom.kind === "prep") {
    if (pom.id === PREPS[state.prepIdx]) {
      state.prepIdx += 1;
      state.prepDayDone = todayStr();
    }
  } else if (pom && pom.kind === "section") {
    const col = Number(pom.col), idx = Number(pom.idx);
    if (!state.secWatched[col].includes(pom.id)) state.secWatched[col].push(pom.id);
    // navbat indexi faqat navbatdagi video ko'rilsa oldinga suriladi
    const q = buildQueue();
    const qItem = q[state.secQueue];
    if (qItem && qItem.col === col && qItem.idx === idx && qItem.id === pom.id) state.secQueue += 1;
  }
  saveState();
  startBreak();
};

/* ---------------- TANAFUS (mashq video) ---------------- */
function startBreak() {
  state.pom = null;
  startPom("break", 5, {});
  showBreakMedia();
}
function showBreakMedia() {
  showView("break");
  const vids = V.BREAK_VIDEOS || [];
  const id = vids.length ? ytId(vids[state.breakIdx % vids.length]) : "";
  const box = $("breakVideoBox");
  if (id) {
    box.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    box.innerHTML = `<div class="muted">Mashq videolari hali qo'shilmadi. BREAK_VIDEOS ro'yxatiga linklarni bersang, shu yerda tanafusda chiqadi. Hozir mashqlarni o'zing bajaring bo'ladi — 5 daqiqa timer chiz.</div>`;
  }
  $("btnBreakDone").hidden = !state.pom || (state.pom.end - Date.now()) > 0;
}
$("btnBreakDone").onclick = () => {
  state.breakIdx += 1;
  state.pom = null;
  saveState();
  showView("plan");
};

/* ---------------- LUG'AT VIEW ---------------- */
function ensureRows(n) {
  while (state.vocab.length < n) state.vocab.push({ w: "", t: "" });
  saveState();
}
function renderVocab() {
  ensureRows(state.vocab.length);
  let html = "";
  state.vocab.forEach((row, i) => {
    html += `<div class="vocab-row" data-i="${i}">
      <div class="num">${i + 1}</div>
      <input class="vw" value="${esc(row.w || "")}" placeholder="so'z" autocomplete="off" />
      <input class="vt" value="${esc(row.t || "")}" placeholder="tarjima" autocomplete="off" />
    </div>`;
    // har 20 ta qatordan keyin test zonasi
    if ((i + 1) % 20 === 0) html += zoneHTML(Math.floor(i / 20), i - 19, i + 1);
  });
  $("vocabList").innerHTML = html;
  bindVocabEvents();
}

function zoneHTML(z, from, to) {
  let btns = "";
  for (let t = 1; t <= 5; t++) {
    const key = "z" + z + "-t" + t;
    const res = state.testResults[key];
    const badge = res ? `<span class="test-res-badge" style="background:#3ddc97;border-radius:8px;padding:2px 6px">${res.score}/${res.total}</span>` : "";
    btns += `<button class="test-btn" data-c="${t}" data-z="${z}" data-t="${t}">Test ${t}${badge}</button>`;
  }
  return `<div class="test-zone" data-z="${z}" data-from="${from}" data-to="${to}">
    <div class="zone-title">🧪 ${from}–${to} lug'atlar testi (oxirgi 20 ta ichidan random)</div>
    <div class="test-btns">${btns}</div>
  </div>`;
}

let lastSpaceTs = 0;
function bindVocabEvents() {
  const list = $("vocabList");
  list.oninput = (e) => {
    const row = e.target.closest(".vocab-row");
    if (!row) return;
    const i = Number(row.dataset.i);
    if (e.target.classList.contains("vw")) state.vocab[i].w = e.target.value;
    else state.vocab[i].t = e.target.value;
    saveState();
    refreshZoneBadges();
  };
  list.onkeydown = (e) => {
    const row = e.target.closest(".vocab-row");
    if (!row) return;
    const i = Number(row.dataset.i);
    const inputs = [row.querySelector(".vw"), row.querySelector(".vt")];
    const cur = e.target.classList.contains("vw") ? 0 : 1;

    // Tab: so'z ustunidan tarjimaga (brauzer default) — tarjimadan keyingi qatorga
    if (e.key === "Tab" && cur === 1) {
      e.preventDefault();
      gotoNextRow(i);
      return;
    }
    // Space 2 marta ketma-ket → narigi ustunga
    if (e.key === " ") {
      const now = Date.now();
      if (now - lastSpaceTs < 400) {
        e.preventDefault();
        if (cur === 0) inputs[1].focus();
        else gotoNextRow(i);
        lastSpaceTs = 0;
        return;
      }
      lastSpaceTs = now;
    }
    // Enter → keyingi qator
    if (e.key === "Enter") {
      e.preventDefault();
      gotoNextRow(i);
    }
  };
}
function gotoNextRow(i) {
  if (i + 1 >= state.vocab.length) {
    state.vocab.push({ w: "", t: "" });
    saveState();
    renderVocab();
  }
  const sel = document.querySelector(`.vocab-row[data-i="${i + 1}"] .vw`);
  if (sel) sel.focus();
  $("vocabList").lastElementChild && window.scrollBy(0, 140);
}
$("btnAddRow").onclick = () => {
  state.vocab.push({ w: "", t: "" });
  saveState();
  renderVocab();
  const sel = document.querySelector(`.vocab-row[data-i="${state.vocab.length - 1}"] .vw`);
  if (sel) sel.focus();
};
function refreshZoneBadges() {
  document.querySelectorAll(".test-btn").forEach(b => {
    const key = `z${b.dataset.z}-t${b.dataset.t}`;
    const res = state.testResults[key];
    if (res && !b.querySelector(".test-res-badge")) {
      b.insertAdjacentHTML("beforeend", `<span class="test-res-badge" style="background:#3ddc97;border-radius:8px;padding:2px 6px">${res.score}/${res.total}</span>`);
    }
  });
}

/* ---------------- RANDOM TEST (5 rang, har 20 ta lugat) ---------------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".test-btn");
  if (!btn) return;
  const z = Number(btn.dataset.z), t = Number(btn.dataset.t);
  openTestPrepare(z, t, btn);
});

let currentTest = null;
function openTestPrepare(z, t) {
  const zone = document.querySelector(`.test-zone[data-z="${z}"]`);
  if (!zone) return;
  const from = Number(zone.dataset.from), to = Number(zone.dataset.to);
  currentTest = { z, t, from, to };
  const phrase = Math.random() < 0.5 ? "so'zlarning tarjimasini yoz" : "berilgan tarjimaga so'zni yoz";
  $("testPanel").hidden = false;
  $("testPanel").innerHTML = `
    <h3 style="margin-bottom:8px">🧪 ${from}–${to} test (Test ${t})</h3>
    <p class="muted">${from}–${to} lug'atlar endi yashirinlikda. <b>${Math.min(5, to-from+1)} ta random so'z</b> tanlanadi — ${phrase}.</p>
    <div class="row-btns">
      <button class="btn primary" id="btnTestGo">Testga tayyorman 🚀</button>
      <button class="btn secondary" id="btnTestClose">Yopish</button>
    </div>`;
  $("btnTestGo").onclick = () => generateTest(z, t, from, to);
  $("btnTestClose").onclick = closeTestPanel;
  document.querySelector(`.test-zone[data-z="${z}"]`).scrollIntoView({ behavior: "smooth", block: "start" });
}
function closeTestPanel() {
  $("testPanel").hidden = true;
  $("testPanel").innerHTML = "";
  document.querySelectorAll(".vocab-row.hidden-word").forEach(r => r.classList.remove("hidden-word"));
}

function generateTest(z, t, from, to) {
  // oxirgi 20 ta lugat yashirin bo'ladi
  document.querySelectorAll(".vocab-row").forEach(r => {
    const i = Number(r.dataset.i);
    if (i >= from && i <= to - 1) r.classList.add("hidden-word");
  });
  // 5 ta random balansi, tasodifiy tarjima→so'z yoki so'z→tarjima
  const idxs = [];
  const pool = [];
  for (let i = from; i < to; i++) pool.push(i);
  const count = Math.min(5, pool.length);
  while (idxs.length < count) {
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (!idxs.includes(r)) idxs.push(r);
  }
  const qs = idxs.map(i => {
    const row = state.vocab[i];
    const askTrans = Math.random() < 0.6; // so'z berilgan → tarjimasini yozish
    return { i, word: row.w || "", trans: row.t || "", askTrans, answer: askTrans ? (row.t || "") : (row.w || "") };
  });
  renderTest(qs, z, t);
}

function renderTest(qs, z, t) {
  let html = `<h3 style="margin-bottom:8px">🧪 Test ${t} — javoblaringni yoz</h3>`;
  qs.forEach((q, n) => {
    const prompt = q.askTrans ? q.word : q.trans;
    const label = q.askTrans ? "So'zni yoz:" : "Tarjimasini yoz:";
    html += `<div class="test-q" data-n="${n}">
      <div class="q-label">${label} — <b>${esc(prompt || "(bo'sh lug'at qatori)")}</b></div>
      <input class="ans" placeholder="javob" autocomplete="off" data-answer="${esc(q.answer)}" />
      <div class="answer"></div>
    </div>`;
  });
  html += `<div class="row-btns">
    <button class="btn primary" id="btnTestCheck">✅ Tayyor — tekshirish</button>
    <button class="btn secondary" id="btnTestClose2">Yopish</button>
  </div><div class="test-score" id="testScore"></div>`;
  $("testPanel").innerHTML = html;
  $("btnTestCheck").onclick = () => checkTest(z, t, qs.length);
  $("btnTestClose2").onclick = closeTestPanel;
  document.querySelector("#testPanel .ans") && document.querySelector("#testPanel .ans").focus();
}

function checkTest(z, t, total) {
  let score = 0;
  document.querySelectorAll("#testPanel .test-q").forEach(qWrap => {
    const inp = qWrap.querySelector(".ans");
    const ans = qWrap.querySelector(".answer");
    const correct = inp.dataset.answer.trim().toLowerCase();
    const mine = inp.value.trim().toLowerCase();
    if (mine && correct && mine === correct) {
      inp.classList.add("ok"); inp.classList.remove("bad");
      ans.textContent = "✅ To'g'ri"; score++;
    } else {
      inp.classList.add("bad"); inp.classList.remove("ok");
      ans.textContent = "❌ To'g'ri javob: " + (correct || "(bo'sh)");
    }
  });
  $("testScore").textContent = `Natija: ${score}/${total}` + (score === total ? " 🎉" : "");
  const key = `z${z}-t${t}`;
  state.testResults[key] = { score, total, ts: Date.now() };
  saveState();
  refreshZoneBadges();
  /* javoblar yo'qolmaydi — panel ochiq qolaveradi, yopib qayta ochsa ham natija badge'da turadi */
}

/* ---------------- QAYTA KO'RISH VIEW (bemalol = control ochiq) ---------------- */
function renderRewatch() {
  if (!state.secWatched) state.secWatched = [[], [], [], []];
  let html = "";
  let any = false;
  SECTIONS.forEach((list, col) => {
    const seen = state.secWatched[col];
    if (!seen.length) return;
    any = true;
    html += `<div class="watchgroup"><h3>📼 ${sectionName(col)} — ${seen.length} ta ko'rilgan</h3>`;
    seen.forEach((id, n) => {
      html += `<div class="watchitem">
        <div>${n + 1}-video <span class="sub" style="color:var(--muted)">ID: ${id}</span></div>
        <button class="btn tiny primary" data-rewatch="${id}">▶ Ko'rish</button>
      </div>`;
    });
    html += `</div>`;
  });
  const prepSeen = PREPS.slice(0, state.prepIdx);
  if (prepSeen.length) {
    any = true;
    html += `<div class="watchgroup"><h3>☀️ Ertalabgi playlist — ${prepSeen.length} ta ko'rilgan</h3>`;
    prepSeen.forEach((id, n) => {
      html += `<div class="watchitem"><div>${n + 1}-video</div><button class="btn tiny primary" data-rewatch="${id}">▶ Ko'rish</button></div>`;
    });
    html += `</div>`;
  }
  if (!any) html = `<div class="muted">Hozirsch ko'rilgan section videosi yo'q — avval dars vazifasini bajar!</div>`;
  $("rewatchList").innerHTML = html;
  $("rewatchList").querySelectorAll("[data-rewatch]").forEach(b => {
    b.onclick = () => {
      $("rewatchPlayerBox").hidden = false;
      $("rewatchPlayer").src = `https://www.youtube.com/embed/${b.dataset.rewatch}?autoplay=1&playsinline=1&rel=0`;
      $("rewatchPlayerBox").scrollIntoView({ behavior: "smooth" });
    };
  });
}

/* ---------------- TARGET VIEW (video + daftar) ---------------- */
function openTarget() {
  showView("target");
  const t = TARGETS[state.targetIdx];
  const box = $("targetVideoBox");
  if (t) {
    // Target videosi nazoratsiz: pauza, resume, vaqt surish bemalol mumkin
    box.innerHTML = `<iframe src="https://www.youtube.com/embed/${t}?playsinline=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen title="Target video"></iframe>`;
    $("targetMsg").textContent = state.targetLastDate === todayStr()
      ? "✅ Bugungi target allaqachon belgilandi — keyingisi keyingi listening kuni." : "";
    $("btnTargetDone").hidden = (state.targetLastDate === todayStr());
  } else {
    box.innerHTML = `<div class="muted">TARGET_VIDEOS ro'yxati bo'sh — «videos.js» ga playlistdan linklar qo'sh, yoki barcha target videolar ko'rildi 🎉</div>`;
    $("btnTargetDone").hidden = true;
  }
  renderNotebook();
}

$("btnTargetDone").onclick = () => {
  if (!TARGETS[state.targetIdx]) return;
  if (state.targetLastDate !== todayStr()) {
    state.targetIdx += 1;
    state.targetLastDate = todayStr();
  }
  saveState();
  $("targetMsg").textContent = "🎉 Bugungi target yozildi! Keyingi target — keyingi listening kuni. Daftarda eshitganlaringni yoz.";
  $("btnTargetDone").hidden = true;
};

/* ---------------- DAFTAR (2 sahifali, o'zi yangi betga o'tadi) ---------------- */
function nbPages() {
  if (!state.notebook || !state.notebook.length) state.notebook = [""];
  return state.notebook;
}
function renderNotebook() {
  const pages = nbPages();
  let spread = Number(state.notebookSpread) || 0;
  const maxSpread = Math.floor((pages.length - 1) / 2);
  if (spread > maxSpread) spread = maxSpread;
  if (spread < 0) spread = 0;
  state.notebookSpread = spread;
  saveState();
  const li = spread * 2, ri = li + 1;
  while (pages.length <= ri) pages.push("");
  $("notebook").innerHTML = `
    <div class="nb-spread">
      <div class="nb-page nb-left">
        <textarea class="nb-text" data-page="${li}" spellcheck="false">${esc(pages[li] || "")}</textarea>
        <div class="nb-num">📄 ${li + 1}-bet</div>
      </div>
      <div class="nb-page nb-right">
        <textarea class="nb-text" data-page="${ri}" spellcheck="false">${esc(pages[ri] || "")}</textarea>
        <div class="nb-num">📄 ${ri + 1}-bet</div>
      </div>
    </div>`;
  $("notePageNum").textContent = `Sahifa ${li + 1}–${ri + 1} ochiq`;
}
$("notebook").oninput = (e) => {
  const ta = e.target.closest("textarea.nb-text");
  if (!ta) return;
  nbPages()[Number(ta.dataset.page)] = ta.value;
  saveState();
};
$("notebook").onkeydown = (e) => {
  const ta = e.target.closest("textarea.nb-text");
  if (!ta || e.key !== "Enter") return;
  // bet oxiriga yetib borsa (qog'oz oqib ketgan bo'lsa) — keyingi betga avtomatik o't
  const full = ta.scrollHeight > ta.clientHeight + 6;
  if (!full) return;
  e.preventDefault();
  const page = Number(ta.dataset.page);
  if (page % 2 === 0) {
    const right = document.querySelector(`textarea[data-page="${page + 1}"]`);
    if (right) right.focus();
  } else {
    // narigi sahifa to'ldi — yangi ochiq sahifa (2 tomonga) o'tamiz
    const pages = nbPages();
    while (pages.length <= page + 2) pages.push("");
    state.notebookSpread = (page + 1) / 2;  // keyingi juftlik
    saveState();
    renderNotebook();
    const nl = document.querySelector(`textarea[data-page="${page + 1}"]`);
    if (nl) nl.focus();
  }
};
$("btnNotePrev").onclick = () => { state.notebookSpread -= 1; renderNotebook(); };
$("btnNoteNext").onclick = () => {
  const pages = nbPages();
  const next = (Number(state.notebookSpread) || 0) + 1;
  while (pages.length <= next * 2) pages.push("");
  state.notebookSpread = next;
  saveState();
  renderNotebook();
};

/* ---------------- tugmalar ---------------- */
$("btnBackPlan").onclick = () => { if (watchdog) { clearInterval(watchdog); watchdog = null; } state.pom = null; saveState(); showView("plan"); };$("btnBackPlan2").onclick = () => { renderVocab(); showView("plan"); };
$("btnBackPlan4").onclick = () => showView("plan");
$("btnVocabDone").onclick = () => openTarget();
$("vocabShortcut").onclick = () => { renderVocab(); showView("vocab"); };
$("btnBackPlan3").onclick = () => { $("rewatchPlayerBox").hidden = true; $("rewatchPlayer").src = ""; showView("plan"); };
$("btnVocab").onclick = () => { renderVocab(); showView("vocab"); };
$("btnRewatch").onclick = () => { renderRewatch(); showView("rewatch"); };

/* ---------------- ishga tushirish ---------------- */
tickClock();
setInterval(tickClock, 1000);
if (state.pom) {
  // sahifa yangilangan bo'lsa ham dars/tanafus davom etadi
  startTimerTicker();
  if (state.pom.mode === "lesson") {
    showView("lesson");
    $("lessonTitle").textContent = state.pom.title || "Dars";
    $("lessonMsg").textContent = "🔑 Sahifa yangilandi — dars davom etyapti.";
    $("btnSwitchNext").hidden = true;
    buildLockedPlayer(state.pom.id);
  } else {
    showBreakMedia();
  }
} else {
  showView("plan");
}
loadRoutine().then(r => { if (!ROUTINE) { ROUTINE = r; if (!$("view-plan").hidden) renderPlan(); } });
