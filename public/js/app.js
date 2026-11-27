import { watchUser, login, register, loginGoogle, logout, loadProgress, saveProgress, auth } from "./firebase.js";
import { getQuestions, VI_SECTIONS } from "./exercises.js";
import { ALPHABET } from "./alphabet.js";
import { SOUND_GROUPS, lessonByKey, snd, sndFile, wordFile } from "./sounds.js";
import { VAN_LEVELS, vanLesson, vanFile, vanWordFile, plain, markWord } from "./van.js";

const $ = id => document.getElementById(id);
const NAMES = { math: "Toán", vi: "Tiếng Việt", en: "Tiếng Anh" };
const ICONS = { math: "🧮", vi: "📖", en: "🌍" };
const COLORS = { math: "var(--sky)", vi: "var(--coral)", en: "#f5a623" };
const state = { user: null, stars: 0, history: [], subject: null, section: null, back: "s-vi", lesson: null, lessonFrom: "s-explore", qs: [], i: 0, got: 0 };

// Hiện một màn hình; mọi màn hình trừ đăng nhập nằm trong khung có thanh điều hướng
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  $("shell").classList.toggle("hidden", id === "s-auth");
  $(id).classList.remove("hidden");
  const tab = ["s-history", "s-stats", "s-info"].includes(id) ? id : "s-home";
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.view === tab));
  if (id === "s-history") renderHistory();
  if (id === "s-stats") renderStats();
  if (id === "s-info") renderInfo();
}
document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

// ---------- Âm thanh & hiệu ứng ----------
function speak(text, lang = "vi-VN") {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel(); sayId++; player.pause();
  const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = .85; speechSynthesis.speak(u);
}
// ----- Bảng chữ cái: phát file âm thanh có sẵn (giống nhau trên mọi thiết bị) -----
// Dùng 1 thẻ Audio duy nhất để iPhone/Safari không chặn khi phát nối tiếp.
const player = new Audio();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function playFile(src) {
  return new Promise((res, rej) => {
    player.onended = player.onpause = res; player.onerror = () => rej(new Error("no audio"));
    player.src = src; player.play().catch(rej);
  });
}
function speakAsync(text) {   // dự phòng: giọng máy khi chưa có file
  return new Promise(res => {
    if (!("speechSynthesis" in window)) return res();
    const u = new SpeechSynthesisUtterance(text); u.lang = "vi-VN"; u.rate = .8; u.onend = u.onerror = res;
    speechSynthesis.speak(u);
  });
}
let sayId = 0;
// Phát lần lượt các [file âm thanh, văn bản dự phòng]; thiếu file thì dùng giọng máy
async function playSeq(items, gap = 450) {
  const id = ++sayId;
  player.pause(); if ("speechSynthesis" in window) speechSynthesis.cancel();
  for (const [src, text] of items) {
    if (id !== sayId) return;
    try { await playFile(src); } catch { if (id !== sayId) return; await sleep(100); await speakAsync(text); }
    if (id !== sayId) return;
    await sleep(gap);
  }
}
const sayLetter = a => playSeq([[`audio/letters/${a.id}.mp3`, a.n], [`audio/words/${a.id}.mp3`, a.w]]);
const sayQ = q => q.clips ? playSeq(q.clips, 350) : speak(q.speak || q.prompt, q.lang);
function beep(ok) {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = ok ? 660 : 200; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(.15, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .3);
    o.start(); o.stop(c.currentTime + .3);
  } catch {}
}
function confetti() {
  const cv = $("fx"), x = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#FFD23F","#FF6B6B","#5CC8FF","#3DBE7A"];
  const ps = Array.from({ length: 90 }, () => ({ x: cv.width / 2, y: cv.height / 2, vx: (Math.random() - .5) * 14, vy: Math.random() * -14 - 3, c: cols[Math.random() * 4 | 0], s: 6 + Math.random() * 6 }));
  let f = 0;
  (function draw() {
    x.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .4; x.fillStyle = p.c; x.fillRect(p.x, p.y, p.s, p.s); });
    if (++f < 80) requestAnimationFrame(draw); else x.clearRect(0, 0, cv.width, cv.height);
  })();
}

// ---------- Đăng nhập / Đăng ký ----------
const msgs = { "auth/invalid-credential": "Sai email hoặc mật khẩu.", "auth/email-already-in-use": "Email này đã có tài khoản.",
  "auth/weak-password": "Mật khẩu cần ít nhất 6 ký tự.", "auth/invalid-email": "Email chưa đúng định dạng." };
async function doAuth(fn) {
  $("authMsg").textContent = "";
  try { await fn($("email").value.trim(), $("password").value); }
  catch (e) { $("authMsg").textContent = msgs[e.code] || "Có lỗi, hãy thử lại."; }
}
$("authForm").addEventListener("submit", e => { e.preventDefault(); doAuth(login); });
$("btnRegister").addEventListener("click", () => { if ($("authForm").reportValidity()) doAuth(register); });
$("btnLogout").addEventListener("click", logout);
$("btnGoogle").addEventListener("click", async () => {
  $("authMsg").textContent = "";
  try { await loginGoogle(); }
  catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
    $("authMsg").textContent = e.code === "auth/popup-blocked" ? "Trình duyệt đang chặn cửa sổ đăng nhập, hãy cho phép rồi thử lại."
      : e.code === "auth/unauthorized-domain" ? "Tên miền chưa được thêm vào Firebase."
      : "Không đăng nhập được bằng Google, hãy thử lại.";
  }
});

watchUser(async user => {
  state.user = user;
  if (!user) return show("s-auth");
  const p = await loadProgress(user.uid);
  state.stars = p.stars || 0; state.history = p.history || [];
  $("starCount").textContent = state.stars;
  show("s-home");
});

// ---------- Lịch sử, thống kê, thông tin ----------
const fmt = ts => new Date(ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const EMPTY = '<p class="empty">Bé chưa học bài nào.<br>Hãy chọn một môn ở Trang chủ nhé! 🌈</p>';

const secTitle = h => { if (h.section?.startsWith("snd:")) return " · Khám phá chữ và âm"; if (h.section?.startsWith("van:")) return " · Bé khám phá vần";
  const x = VI_SECTIONS.find(v => v.id === h.section); return x ? " · " + x.title : ""; };
function renderHistory() {
  const box = $("historyList");
  if (!state.history.length) { box.innerHTML = EMPTY; return; }
  box.innerHTML = [...state.history].sort((a, b) => b.ts - a.ts).slice(0, 50).map(h =>
    `<div class="row"><span class="e">${ICONS[h.subject] || "📘"}</span>${NAMES[h.subject] || ""}${secTitle(h)}
     <span>${h.correct}/${h.total} câu đúng ngay lần đầu</span><small>${fmt(h.ts)}</small></div>`).join("");
}
function renderStats() {
  const H = state.history, sum = k => H.reduce((n, h) => n + h[k], 0);
  $("stStars").textContent = state.stars; $("stSessions").textContent = H.length;
  $("stRate").textContent = (sum("total") ? Math.round(sum("correct") / sum("total") * 100) : 0) + "%";
  $("statSubjects").innerHTML = Object.keys(NAMES).map(k => {
    const hs = H.filter(h => h.subject === k), c = hs.reduce((n, h) => n + h.correct, 0), t = hs.reduce((n, h) => n + h.total, 0);
    const pct = t ? Math.round(c / t * 100) : 0;
    return `<div class="row col"><div>${ICONS[k]} ${NAMES[k]} <small>${hs.length} bài · ${c}/${t} câu đúng (${pct}%)</small></div>
      <div class="meter"><i style="width:${pct}%;background:${COLORS[k]}"></i></div></div>`;
  }).join("");
}
function renderInfo() {
  const u = auth.currentUser; if (!u) return;
  $("infoEmail").textContent = u.displayName ? `${u.displayName} (${u.email})` : u.email;
  const t = u.metadata.creationTime;
  $("infoSince").textContent = "Tham gia từ " + (t ? new Date(t).toLocaleDateString("vi-VN") : "—");
}

// ---------- Học ----------
document.querySelectorAll(".subject").forEach(b => b.addEventListener("click", () =>
  b.dataset.subject === "vi" ? show("s-vi") : start(b.dataset.subject)));

// Màn hình chọn phần học của môn Tiếng Việt (nội dung là hằng số trong exercises.js)
$("viGrid").innerHTML = VI_SECTIONS.map((x, i) =>
  `<button class="sec" data-sec="${x.id}" style="background:${x.color}">
     <span class="sec-top"><span class="sec-ico">${x.icon}</span><span class="sec-num">${String(i + 1).padStart(2, "0")}</span></span>
     <b>${x.title}</b><small>${x.desc}</small></button>`).join("");
$("viGrid").addEventListener("click", e => { const b = e.target.closest(".sec"); if (!b) return;
  const to = { letters: "s-alpha", sounds: "s-sound" }[b.dataset.sec];
  if (to) show(to); else { state.back = "s-vi"; start("vi", b.dataset.sec); } });
$("btnViBack").addEventListener("click", () => show("s-home"));

// Bảng chữ cái: bấm vào chữ để nghe đọc (dữ liệu là hằng số trong alphabet.js)
$("alphaGrid").innerHTML = ALPHABET.map((a, i) =>
  `<button class="letter" data-i="${i}" aria-label="Chữ ${a.u}, ${a.w}">
     <span class="lt"><b class="up">${a.u}</b><b class="lo">${a.l}</b></span>
     <span class="pic">${a.e}</span><span class="nm">${a.w}</span></button>`).join("");
$("alphaGrid").addEventListener("click", e => {
  const b = e.target.closest(".letter"); if (!b) return;
  const a = ALPHABET[b.dataset.i];
  sayLetter(a);
  b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
});
$("btnAlphaBack").addEventListener("click", () => show("s-vi"));

// Thế giới âm › Khám phá chữ và âm (dữ liệu là hằng số trong sounds.js)
$("btnSoundBack").addEventListener("click", () => show("s-vi"));
$("goExplore").addEventListener("click", () => show("s-explore"));
$("btnExploreBack").addEventListener("click", () => show("s-sound"));
$("btnLessonBack").addEventListener("click", () => show(state.lessonFrom));
$("exploreList").innerHTML = SOUND_GROUPS.map(g =>
  `<div class="grp"><h3>${g.title}${g.star ? ' <span class="star">⭐ Nên học trước</span>' : ""}</h3><div class="lessons">${
    g.lessons.map((l, i) => `<button class="lesson" data-key="${g.id}${i + 1}"><span class="ln">Bài ${i + 1}</span><b>${l[0]} – ${l[1]}</b><small>${l[2]}</small></button>`).join("")}</div></div>`).join("");
$("exploreList").addEventListener("click", e => { const b = e.target.closest(".lesson"); if (b) openLesson(b.dataset.key); });
// Tô đậm, đổi màu phần âm đang học trong từ (q → "qu")
const hlWord = (w, c) => { const p = c === "q" ? "qu" : c; return w.startsWith(p) ? `<b class="hl">${p}</b>${w.slice(p.length)}` : w; };
// Trang bài học dùng chung cho Khám phá chữ và âm / Bé khám phá vần
// d = { title, desc, from, play, panels: [{ label, say, src, words: [{ say, src, e, html }] }] }
function renderLesson(d) {
  state.lesson = d.play; state.lessonFrom = d.from;
  $("lessonTitle").textContent = d.title; $("lessonDesc").textContent = d.desc + " · Bấm vào chữ hoặc hình để nghe 🔊";
  $("lessonBody").className = "pair n" + d.panels.length;
  $("lessonBody").innerHTML = d.panels.map((p, i) =>
    `<div class="panel p${i}"><button class="bigl" data-say="${p.say}" data-src="${p.src}">${p.label}</button><div class="wds">${
      p.words.map(w => `<button class="wd" data-say="${w.say}" data-src="${w.src}"><span>${w.e}</span><em>${w.html}</em></button>`).join("")}</div></div>`).join("");
  show("s-lesson");
}
function openLesson(key) {
  const L = lessonByKey(key);
  renderLesson({ title: `${L.x} – ${L.y}`, desc: L.desc, from: "s-explore", play: "snd:" + key,
    panels: [L.x, L.y].map((c, i) => ({ label: c, say: snd(c), src: sndFile(c),
      words: L.words[i].map(([w, e], j) => ({ say: w, src: wordFile(c, j), e, html: hlWord(w, c) })) })) });
}
// Bé khám phá vần
$("goVan").addEventListener("click", () => show("s-van"));
$("btnVanBack").addEventListener("click", () => show("s-sound"));
$("vanList").innerHTML = VAN_LEVELS.map(g =>
  `<div class="grp"><h3>${g.title} <small>${g.sub}</small></h3><div class="lessons">${
    g.lessons.map((l, i) => `<button class="lesson${l.length > 2 ? " l3" : ""}" data-key="${g.id}-${i + 1}"><span class="ln">Bài ${i + 1}</span><b>${l.join(" – ")}</b><small>${
      l.map(v => plain(vanLesson(`${g.id}-${i + 1}`).words[l.indexOf(v)][0][0])).join(" – ")}</small></button>`).join("")}</div></div>`).join("");
$("vanList").addEventListener("click", e => { const b = e.target.closest(".lesson"); if (b) openVan(b.dataset.key); });
function openVan(key) {
  const L = vanLesson(key);
  renderLesson({ title: L.vans.join(" – "), desc: L.desc, from: "s-van", play: "van:" + key,
    panels: L.vans.map((v, i) => ({ label: v, say: v, src: vanFile(v),
      words: L.words[i].map(([w, e], j) => ({ say: plain(w), src: vanWordFile(v, j), e, html: markWord(w) })) })) });
}
$("lessonBody").addEventListener("click", e => { const b = e.target.closest("[data-say]"); if (b) playSeq([[b.dataset.src, b.dataset.say]]); });
$("btnLessonPlay").addEventListener("click", () => { state.back = "s-lesson"; start("vi", state.lesson); });

async function start(subject, section = null) {
  state.subject = subject; state.section = section; state.i = 0; state.got = 0; $("quizStars").textContent = state.stars;
  state.qs = await getQuestions(subject, false, 5, section);
  show("s-quiz"); render();
}
function render() {
  const q = state.qs[state.i]; q.missed = false;
  $("barFill").style.width = (state.i / state.qs.length * 100) + "%";
  $("qEmoji").textContent = q.emoji || ""; $("qText").textContent = q.text || ""; $("qPrompt").textContent = q.prompt; $("feedback").textContent = "";
  const box = $("options"); box.innerHTML = "";
  q.options.forEach(o => {
    const b = document.createElement("button"); b.className = "opt"; b.textContent = o;
    b.onclick = () => answer(b, o === q.answer); box.appendChild(b);
  });
  sayQ(q);
}
$("btnSpeak").addEventListener("click", () => { sayQ(state.qs[state.i]); });

function answer(btn, ok) {
  if ($("options").classList.contains("lock")) return;
  const q = state.qs[state.i];
  beep(ok);
  if (!ok) { q.missed = true; btn.classList.add("bad"); $("feedback").textContent = "Thử lại nhé! 💪"; return; }
  $("options").classList.add("lock"); btn.classList.add("ok");
  $("feedback").textContent = "Đúng rồi! 🎉"; confetti();
  if (!q.missed) { state.got++; state.stars++; }   // sao cho câu đúng ngay lần đầu
  $("quizStars").textContent = state.stars; $("starCount").textContent = state.stars;
  setTimeout(() => {
    $("options").classList.remove("lock");
    if (++state.i < state.qs.length) render(); else finish();
  }, 1200);
}
async function finish() {
  const total = state.qs.length;
  $("doneStars").textContent = state.got; show("s-done"); confetti(); speak("Giỏi quá!");
  $("btnHome").textContent = state.subject === "vi" ? "Chọn bài khác" : "Về trang chủ";
  state.history.push({ subject: state.subject, section: state.section, correct: state.got, total, ts: Date.now() });
  try { await saveProgress(state.user.uid, state.subject, state.got, total, state.section); } catch (e) { console.warn("Chưa lưu được", e); }
}
const backTo = () => show(state.subject === "vi" ? (state.back || "s-vi") : "s-home");
$("btnAgain").addEventListener("click", () => start(state.subject, state.section));
$("btnHome").addEventListener("click", backTo);
$("btnBack").addEventListener("click", backTo);