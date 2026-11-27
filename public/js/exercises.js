import { API_BASE } from "./config.js";
import { auth } from "./firebase.js";
import { soundQuestion } from "./sounds.js";
import { vanQuestion } from "./van.js";

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => [...a].sort(() => Math.random() - .5);
const choices = (right, pool) => shuffle([right, ...shuffle(pool.filter(x => x !== right)).slice(0, 3)]);
const Q = (o, speak, lang = "vi-VN") => ({ emoji: "", ...o, speak: speak || o.prompt, lang });

// ===== Các phần học môn Tiếng Việt (hiện ở màn hình chọn bài) =====
export const VI_SECTIONS = [
  { id: "letters", icon: "🔤", title: "Bảng chữ cái",      desc: "Nhận diện chữ và âm",        color: "#dbe8ff" },
  { id: "sounds",  icon: "🔊", title: "Thế giới âm vần",    desc: "Chữ, âm và vần",       color: "#fde4ef" },
  { id: "build",   icon: "🧩", title: "Xưởng ghép chữ",     desc: "Ghép âm tạo tiếng",           color: "#ddf9e6" },
  { id: "rhyme",   icon: "🏰", title: "Vương quốc vần",     desc: "Khám phá các vần",            color: "#fff0c2" },
  { id: "tones",   icon: "🎨", title: "Sắc màu thanh điệu", desc: "Học 6 thanh tiếng Việt",      color: "#ebe7ff" },
  { id: "words",   icon: "📚", title: "Thư viện từ ngữ",    desc: "Đọc từ và câu",               color: "#ffe9d2" },
  { id: "story",   icon: "📖", title: "Thế giới đọc hiểu",  desc: "Đọc truyện, trả lời câu hỏi", color: "#cdf7fd" }
];

const LETTERS = [..."aăâbcdđeêghiklmnoôơpqrstuưvxy"];
const VOWELS = [..."aăâeêioôơuưy"];
const SYL_C = [..."bdđhlmnstvx"], SYL_V = [..."aeioôơuư"];
const VANS = { an: ["bàn", "lan", "đàn"], ao: ["sao", "bao", "gạo"], eo: ["mèo", "heo", "kéo"], am: ["cam", "tám", "làm"] };
const TONES = ["ngang", "huyền", "sắc", "hỏi", "ngã", "nặng"];
const TONE_WORDS = [["ba","bà","bá","bả","bã","bạ"], ["ma","mà","má","mả","mã","mạ"], ["la","là","lá","lả","lã","lạ"], ["ca","cà","cá","cả","cã","cạ"]];
const PICS = [["🐟","cá"],["🐔","gà"],["🏠","nhà"],["🌙","trăng"],["🍌","chuối"],["🐘","voi"],["🌸","hoa"],["🦋","bướm"],["🐱","mèo"],["🐶","chó"],["⭐","sao"],["🚗","xe"]];
const SENT = [["Con mèo kêu ___","meo meo",["gâu gâu","ò ó o","cạc cạc"]], ["Con chó kêu ___","gâu gâu",["meo meo","ò ó o","cạc cạc"]],
  ["Bé đánh ___ mỗi sáng","răng",["xe","cá","mưa"]], ["Trời mưa, bé mang ___","ô",["quạt","kem","dép"]]];
const STORIES = [
  { t: "Bé Na có một con mèo tên là Mi. Mi rất thích ăn cá.", q: [["Con mèo tên là gì?","Mi",["Na","Lu","Bi"]], ["Mi thích ăn gì?","cá",["kẹo","rau","bánh"]]] },
  { t: "Sáng nay trời mưa to. Bé mặc áo mưa màu vàng đi học.", q: [["Hôm nay trời thế nào?","mưa",["nắng","gió","tuyết"]], ["Áo mưa của bé màu gì?","vàng",["đỏ","xanh","tím"]]] },
  { t: "Trên cây có ba chú chim. Một chú bay đi. Còn lại hai chú.", q: [["Lúc đầu có mấy chú chim?","ba",["một","hai","bốn"]], ["Còn lại mấy chú chim?","hai",["một","ba","bốn"]]] },
  { t: "Ông đưa bé ra vườn. Bé tưới nước cho hoa hồng.", q: [["Ai đưa bé ra vườn?","Ông",["Bà","Mẹ","Bố"]], ["Bé tưới nước cho gì?","hoa",["xe","mèo","bàn"]]] }
];

const VI_GEN = {
  letters() {
    const l = pick(LETTERS);
    if (Math.random() < .5)
      return Q({ prompt: "Chữ thường của chữ này là gì?", emoji: l.toUpperCase(), options: choices(l, LETTERS), answer: l }, `Chữ ${l}`);
    return Q({ prompt: "Chữ in hoa của chữ này là gì?", emoji: l, options: choices(l.toUpperCase(), LETTERS.map(x => x.toUpperCase())), answer: l.toUpperCase() }, `Chữ ${l}`);
  },
  sounds() {
    const l = pick(LETTERS), a = VOWELS.includes(l) ? "Nguyên âm" : "Phụ âm";
    return Q({ prompt: `Chữ “${l}” là nguyên âm hay phụ âm?`, emoji: l, options: ["Nguyên âm", "Phụ âm"], answer: a });
  },
  build() {
    const c = pick(SYL_C), v = pick(SYL_V), ans = c + v;
    return Q({ prompt: `${c} + ${v} = ?`, emoji: "🧩", options: choices(ans, SYL_V.map(x => c + x)), answer: ans }, `${c} ghép với ${v} thành tiếng gì?`);
  },
  rhyme() {
    const van = pick(Object.keys(VANS)), ans = pick(VANS[van]);
    const others = Object.keys(VANS).filter(k => k !== van).flatMap(k => VANS[k]);
    return Q({ prompt: `Tiếng nào có vần “${van}”?`, emoji: "🏰", options: choices(ans, others), answer: ans });
  },
  tones() {
    const row = pick(TONE_WORDS), t = rnd(6);
    return Q({ prompt: "Tiếng này có thanh gì?", emoji: row[t], options: choices(TONES[t], TONES), answer: TONES[t] }, `Tiếng ${row[t]} có thanh gì?`);
  },
  words() {
    if (Math.random() < .6) {
      const [e, w] = pick(PICS);
      return Q({ prompt: "Đây là gì?", emoji: e, options: choices(w, PICS.map(x => x[1])), answer: w });
    }
    const [s, a, d] = pick(SENT);
    return Q({ prompt: s, options: choices(a, d), answer: a }, s.replace("___", "gì"));
  },
  story() {
    const st = pick(STORIES), [q, a, d] = pick(st.q);
    return Q({ text: st.t, prompt: q, options: choices(a, d), answer: a }, `${st.t} ${q}`);
  }
};

// ===== Toán & Tiếng Anh (bài tập tạo sẵn) =====
const ANIMALS = ["🐶","🐱","🐰","🐻","🐸","🐥","🍎","🍓","🚗","⭐"];
const EN = [["🐱","cat"],["🐶","dog"],["🍎","apple"],["🚗","car"],["🐟","fish"],["☀️","sun"],["📖","book"],["🌳","tree"]];
const gen = {
  math() {
    if (Math.random() < .5) {
      const n = 1 + rnd(10), e = pick(ANIMALS);
      return Q({ prompt: "Có bao nhiêu con?", emoji: e.repeat(n), options: choices(String(n), ["1","2","3","4","5","6","7","8","9","10"]), answer: String(n) });
    }
    const a = rnd(6), b = 1 + rnd(5), s = String(a + b);
    return Q({ prompt: `${a} + ${b} = ?`, options: choices(s, ["1","2","3","4","5","6","7","8","9","10","11"]), answer: s }, `${a} cộng ${b} bằng mấy?`);
  },
  vi: section => section?.startsWith("snd:") ? soundQuestion(section.slice(4)) : section?.startsWith("van:") ? vanQuestion(section.slice(4)) : VI_GEN[section || "words"](),
  en() {
    const [e, w] = pick(EN);
    return Q({ prompt: "What is this?", emoji: e, options: choices(w, EN.map(x => x[1])), answer: w }, "What is this?", "en-US");
  }
};

export async function getQuestions(subject, useAI, n = 5, section = null) {
  if (useAI && API_BASE && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      const r = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, count: n })
      });
      if (r.ok) { const d = await r.json(); if (d.questions?.length) return d.questions; }
    } catch (e) { console.warn("AI lỗi, dùng bài tập có sẵn", e); }
  }
  return Array.from({ length: n }, () => gen[subject](section));
}
