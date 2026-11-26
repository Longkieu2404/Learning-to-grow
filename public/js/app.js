import { watchUser, login, register, loginGoogle, logout, loadProgress, saveProgress, auth } from "./firebase.js";
import { getQuestions } from "./exercises.js";

const $ = id => document.getElementById(id);
const NAMES = { math: "Toán", vi: "Tiếng Việt", en: "Tiếng Anh" };
const ICONS = { math: "🧮", vi: "📖", en: "🌍" };
const COLORS = { math: "var(--sky)", vi: "var(--coral)", en: "#f5a623" };
const state = { user: null, stars: 0, history: [], subject: null, qs: [], i: 0, got: 0 };

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
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = .85; speechSynthesis.speak(u);
}
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

function renderHistory() {
  const box = $("historyList");
  if (!state.history.length) { box.innerHTML = EMPTY; return; }
  box.innerHTML = [...state.history].sort((a, b) => b.ts - a.ts).slice(0, 50).map(h =>
    `<div class="row"><span class="e">${ICONS[h.subject] || "📘"}</span>${NAMES[h.subject] || ""}
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
document.querySelectorAll(".subject").forEach(b => b.addEventListener("click", () => start(b.dataset.subject)));
async function start(subject) {
  state.subject = subject; state.i = 0; state.got = 0; $("quizStars").textContent = state.stars;
  state.qs = await getQuestions(subject, false);
  show("s-quiz"); render();
}
function render() {
  const q = state.qs[state.i]; q.missed = false;
  $("barFill").style.width = (state.i / state.qs.length * 100) + "%";
  $("qEmoji").textContent = q.emoji || ""; $("qPrompt").textContent = q.prompt; $("feedback").textContent = "";
  const box = $("options"); box.innerHTML = "";
  q.options.forEach(o => {
    const b = document.createElement("button"); b.className = "opt"; b.textContent = o;
    b.onclick = () => answer(b, o === q.answer); box.appendChild(b);
  });
  speak(q.speak || q.prompt, q.lang);
}
$("btnSpeak").addEventListener("click", () => { const q = state.qs[state.i]; speak(q.speak || q.prompt, q.lang); });

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
  state.history.push({ subject: state.subject, correct: state.got, total, ts: Date.now() });
  try { await saveProgress(state.user.uid, state.subject, state.got, total); } catch (e) { console.warn("Chưa lưu được", e); }
}
$("btnAgain").addEventListener("click", () => start(state.subject));
$("btnHome").addEventListener("click", () => show("s-home"));
$("btnBack").addEventListener("click", () => show("s-home"));