import { API_BASE } from "./config.js";
import { auth } from "./firebase.js";
import { soundQuestion } from "./sounds.js";
import { vanQuestion } from "./van.js";
import { spellQuestion } from "./spell.js";

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => [...a].sort(() => Math.random() - .5);
const choices = (right, pool) => shuffle([right, ...shuffle(pool.filter(x => x !== right)).slice(0, 3)]);
const Q = (o, speak, lang = "vi-VN") => ({ emoji: "", ...o, speak: speak || o.prompt, lang });

// ===== Các phần học môn Tiếng Việt (hiện ở màn hình chọn bài) =====
export const VI_SECTIONS = [
  { id: "letters", icon: "🔤", title: "Bảng chữ cái",    desc: "Nhận diện chữ và âm",              color: "#dbe8ff" },
  { id: "sounds",  icon: "🔊", title: "Thế giới âm vần", desc: "Chữ, âm và vần",                   color: "#fde4ef" },
  { id: "spell",   icon: "🗣️", title: "Đánh vần",        desc: "Ghép âm đầu, vần và thanh điệu",   color: "#ddf9e6" }
];

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
  vi: section => section.startsWith("snd:") ? soundQuestion(section.slice(4)) : section.startsWith("van:") ? vanQuestion(section.slice(4)) : spellQuestion(section.slice(6)),
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
