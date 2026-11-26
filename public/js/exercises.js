import { API_BASE } from "./config.js";
import { auth } from "./firebase.js";

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => [...a].sort(() => Math.random() - .5);
const choices = (right, pool) => shuffle([right, ...shuffle(pool.filter(x => x !== right)).slice(0, 3)]);

const ANIMALS = ["🐶","🐱","🐰","🐻","🐸","🐥","🍎","🍓","🚗","⭐"];
const VI = [["🐟","cá"],["🐔","gà"],["🏠","nhà"],["🌙","trăng"],["🍌","chuối"],["🐘","voi"],["🌸","hoa"],["🦋","bướm"]];
const EN = [["🐱","cat"],["🐶","dog"],["🍎","apple"],["🚗","car"],["🐟","fish"],["☀️","sun"],["📖","book"],["🌳","tree"]];

// Bài tập tạo sẵn trong trình duyệt (dùng khi tắt AI hoặc AI lỗi)
const gen = {
  math() {
    if (Math.random() < .5) {
      const n = 1 + rnd(10), e = pick(ANIMALS);
      return { prompt: "Có bao nhiêu con?", emoji: e.repeat(n), options: choices(String(n), ["1","2","3","4","5","6","7","8","9","10"]), answer: String(n), speak: "Có bao nhiêu con?", lang: "vi-VN" };
    }
    const a = rnd(6), b = 1 + rnd(5), s = String(a + b);
    return { prompt: `${a} + ${b} = ?`, emoji: "", options: choices(s, ["1","2","3","4","5","6","7","8","9","10","11"]), answer: s, speak: `${a} cộng ${b} bằng mấy?`, lang: "vi-VN" };
  },
  vi() {
    const [e, w] = pick(VI), first = w[0];
    return { prompt: `Chữ cái đầu của từ “${w}” là gì?`, emoji: e, options: choices(first, [..."abcdeghklmnoptvx"]), answer: first, speak: `Chữ cái đầu của từ ${w} là gì?`, lang: "vi-VN" };
  },
  en() {
    const [e, w] = pick(EN);
    return { prompt: "What is this?", emoji: e, options: choices(w, EN.map(x => x[1])), answer: w, speak: "What is this?", lang: "en-US" };
  }
};

export async function getQuestions(subject, useAI, n = 5) {
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
  return Array.from({ length: n }, () => gen[subject]());
}
