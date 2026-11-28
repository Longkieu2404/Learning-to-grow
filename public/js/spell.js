// Đánh vần: âm đầu + vần = tiếng, thêm thanh điệu = từ có nghĩa. Dữ liệu lấy từ các từ 1 tiếng trong van.js
// (ví dụ "m[èo]" → âm đầu m, vần eo, thanh huyền, từ mèo), nên mọi từ đều có hình minh họa và âm thanh.
import { V, VAN_LEVELS, vid, vanFile, vanWordFile } from "./van.js";
import { snd } from "./sounds.js";

export const TONES = [
  { name: "ngang", mark: "—" }, { name: "huyền", mark: "`" }, { name: "sắc", mark: "´" },
  { name: "hỏi", mark: "?" }, { name: "ngã", mark: "~" }, { name: "nặng", mark: "." }
];
export const SPELL_PHRASES = { tone: "Tiếng này có thanh gì?", onset: "Từ này bắt đầu bằng âm nào?" };

// Tên file âm thanh (tạo bằng tools/generate_audio*.py --set spell); âm vần và từ dùng lại file của phần vần
export const oFile = o => `audio/spell/o-${o.replace("đ", "dd")}.mp3`;   // âm đầu: mờ, cờ...
export const bFile = w => `audio/spell/b-${w.wid}.mp3`;                   // tiếng chưa có dấu: meo
export const tFile = k => `audio/spell/t-${k + 1}.mp3`;                   // tên thanh: huyền
export const pFile = k => `audio/spell/p-${k}.mp3`;

const MARKS = ["\u0300", "\u0301", "\u0309", "\u0303", "\u0323"];          // huyền, sắc, hỏi, ngã, nặng
const toneOf = s => { const d = s.normalize("NFD"), k = MARKS.findIndex(m => d.includes(m)); return k < 0 ? 0 : k + 1; };
const strip = s => s.normalize("NFD").replace(/[\u0300\u0301\u0309\u0303\u0323]/g, "").normalize("NFC");

export const SPELL_WORDS = [];
for (const [van, ws] of Object.entries(V)) ws.forEach(([w, e], j) => {
  const m = w.match(/^([^\[\] ]+)\[([^\]]+)\]$/);          // chỉ lấy từ 1 tiếng có âm đầu
  if (!m || strip(m[2]) !== van) return;
  SPELL_WORDS.push({ onset: m[1], van, vt: m[2], tone: toneOf(m[2]), word: m[1] + m[2], e, j, wid: vid(van) + (j + 1) });
});

const evenly = (a, n) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor(i * a.length / n)]));
export function spellLesson(key) {            // "t0".."t5" = theo thanh; "v<cấp>-<bài>" = theo vần
  if (key[0] === "t") { const k = +key.slice(1);
    return { title: `Thanh ${TONES[k].name} ( ${TONES[k].mark} )`, words: evenly(SPELL_WORDS.filter(w => w.tone === k), 12) }; }
  const [lv, n] = key.slice(1).split("-"), vans = VAN_LEVELS.find(l => l.id === lv).lessons[n - 1];
  return { title: `Vần ${vans.join(", ")}`, words: SPELL_WORDS.filter(w => vans.includes(w.van)) };
}
const eg = k => spellLesson(k).words.slice(0, 2).map(w => w.word).join(" – ");
export const SPELL_GROUPS = [
  { title: "Đánh vần với 6 thanh điệu", sub: "ngang, huyền, sắc, hỏi, ngã, nặng",
    lessons: TONES.map((t, k) => ({ key: "t" + k, tag: `Bài ${k + 1}`, label: `Thanh ${t.name}`, small: `${t.mark} · ${eg("t" + k)}` })) },
  ...VAN_LEVELS.map(L => ({ title: L.title, sub: L.sub,
    lessons: L.lessons.map((vs, i) => ({ key: `v${L.id}-${i + 1}`, tag: `Bài ${i + 1}`, label: vs.join(" – "), small: eg(`v${L.id}-${i + 1}`) })) }))
];
// 5 bước đánh vần: âm đầu → vần → tiếng → thanh → từ  ([file âm thanh, văn bản dự phòng])
export const spellClips = w => [[oFile(w.onset), snd(w.onset)], [vanFile(w.van), w.van], [bFile(w), w.onset + w.van],
  [tFile(w.tone), TONES[w.tone].name], [vanWordFile(w.van, w.j), w.word]];

const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)], shuf = a => [...a].sort(() => Math.random() - .5);
export function spellQuestion(key) {
  const ws = spellLesson(key).words, w = pick(ws), t = rnd(3), base = { emoji: "", lang: "vi-VN" }, wc = [vanWordFile(w.van, w.j), w.word];
  if (t === 0) {                               // ghép âm đầu + vần → chọn từ
    const opts = [...new Set(ws.map(x => x.word))].filter(x => x !== w.word);
    return { ...base, prompt: `${w.onset} + ${w.vt} = ?`, emoji: "🧩", options: shuf([w.word, ...shuf(opts).slice(0, 3)]), answer: w.word,
      speak: `${snd(w.onset)}, ${w.van}`, clips: [[oFile(w.onset), snd(w.onset)], [vanFile(w.van), w.van]] };
  }
  if (t === 1) {                               // nhìn hình → chọn thanh
    const me = TONES[w.tone].name;
    return { ...base, prompt: `Tiếng “${w.word}” có thanh gì?`, emoji: w.e, options: shuf([me, ...shuf(TONES.map(x => x.name).filter(x => x !== me)).slice(0, 3)]),
      answer: me, speak: `${w.word}. ${SPELL_PHRASES.tone}`, clips: [wc, [pFile("tone"), SPELL_PHRASES.tone]] };
  }
  let pool = [...new Set(ws.map(x => x.onset))].filter(x => x !== w.onset);   // nhìn hình → chọn âm đầu
  if (pool.length < 3) pool = [...new Set([...pool, ...SPELL_WORDS.map(x => x.onset)])].filter(x => x !== w.onset);
  return { ...base, prompt: `Từ “${w.word}” bắt đầu bằng âm nào?`, emoji: w.e, options: shuf([w.onset, ...shuf(pool).slice(0, 3)]), answer: w.onset,
    speak: `${w.word}. ${SPELL_PHRASES.onset}`, clips: [wc, [pFile("onset"), SPELL_PHRASES.onset]] };
}
