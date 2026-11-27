// Thế giới âm › Khám phá chữ và âm: nhóm bài học + từ minh họa (emoji) + bộ tạo câu hỏi luyện tập.
const W = {  // chữ/cụm chữ → 5 từ minh họa [từ, hình]; mỗi từ bắt đầu bằng đúng chữ/cụm chữ đó (được tô màu khi hiển thị)
  b: [["bò","🐄"],["bóng","⚽"],["bướm","🦋"],["bút","✏️"],["bánh","🍰"]],
  d: [["dê","🐐"],["dưa","🍉"],["dù","☂️"],["dép","🩴"],["dâu","🍓"]],
  p: [["pin","🔋"],["pizza","🍕"],["pi-a-nô","🎹"],["ping-pong","🏓"],["pa-ra-sút","🪂"]],
  q: [["quần","👖"],["quýt","🍊"],["quà","🎁"],["quyển sách","📖"],["quả táo","🍎"]],
  c: [["cá","🐟"],["cà rốt","🥕"],["cua","🦀"],["cờ","🚩"],["cơm","🍚"]],
  k: [["kẹo","🍬"],["kéo","✂️"],["kem","🍦"],["kiến","🐜"],["kính","👓"]],
  g: [["gà","🐔"],["gấu","🐻"],["gạo","🌾"],["gió","💨"],["gương","🪞"]],
  h: [["hoa","🌸"],["hổ","🐯"],["hươu","🦌"],["hộp","📦"],["hát","🎤"]],
  s: [["sao","⭐"],["sóc","🐿️"],["sách","📚"],["sữa","🥛"],["sư tử","🦁"]],
  x: [["xe","🚗"],["xoài","🥭"],["xúc xích","🌭"],["xương","🦴"],["xô","🪣"]],
  l: [["lá","🍃"],["lê","🍐"],["lợn","🐖"],["lửa","🔥"],["lạc","🥜"]],
  n: [["nơ","🎀"],["nón","👒"],["nấm","🍄"],["nến","🕯️"],["nước","💧"]],
  r: [["rồng","🐉"],["rổ","🧺"],["rùa","🐢"],["rau","🥬"],["rắn","🐍"]],
  t: [["táo","🍎"],["tôm","🦐"],["tay","✋"],["tàu","🚢"],["ti vi","📺"]],
  ch: [["chó","🐶"],["chuối","🍌"],["chim","🐦"],["chổi","🧹"],["chuột","🐭"]],
  th: [["thỏ","🐰"],["thuyền","⛵"],["thư","✉️"],["thìa","🥄"],["thịt","🥩"]],
  nh: [["nhà","🏠"],["nhện","🕷️"],["nhẫn","💍"],["nhím","🦔"],["nhạc","🎵"]],
  gh: [["ghế","🪑"],["ghi-ta","🎸"],["ghẹ","🦀"],["ghe","🛶"],["ghim","📌"]],
  ng: [["ngô","🌽"],["ngựa","🐴"],["ngủ","😴"],["ngón tay","👆"],["ngôi sao","⭐"]],
  ngh: [["nghé","🐃"],["nghe","🎧"],["nghỉ","🛌"],["nghêu","🦪"],["nghịch","🤪"]],
  kh: [["khỉ","🐵"],["khóa","🔒"],["khăn","🧣"],["khóc","😭"],["khủng long","🦖"]],
  ph: [["phở","🍜"],["phim","🎬"],["phòng","🚪"],["pháo hoa","🎆"],["phi cơ","✈️"]],
  tr: [["trăng","🌙"],["trứng","🥚"],["trâu","🐃"],["trống","🥁"],["trà","🍵"]]
};
// [chữ 1, chữ 2, ví dụ / mô tả]
export const SOUND_GROUPS = [
  { id: "A", title: "Nhóm A – Chữ đơn và chữ đơn", lessons: [
    ["b","d","ba – da"], ["p","q","Nhận diện hình dạng chữ"], ["c","k","cá – kẹo"], ["g","h","gà – hoa"],
    ["s","x","sáo – xe"], ["l","n","lá – na"], ["r","d","Nhận biết theo giọng địa phương"]] },
  { id: "B", star: true, title: "Nhóm B – Chữ đơn và chữ ghép", lessons: [
    ["c","ch","cá – cha"], ["t","th","ta – tha"], ["n","nh","na – nha"], ["g","gh","gà – ghế"],
    ["ng","ngh","ngô – nghe"], ["k","kh","ke – khe"], ["p","ph","Từ quen thuộc"]] },
  { id: "C", title: "Nhóm C – Chữ ghép và chữ ghép", lessons: [
    ["ch","tr","chó – tre"], ["ng","nh","ngô – nhà"], ["ph","th","phở – thỏ"], ["kh","ch","khỉ – chó"]] }
];
// Cặp có âm đọc giống nhau → không hỏi kiểu "nghe âm chọn chữ"
const SAME_SOUND = new Set(["c-k","g-gh","ng-ngh","r-d","s-x","ch-tr"]);

// Câu dẫn đọc to trong bài luyện tập (tạo thành file audio/sounds/p-<tên>.mp3)
export const PHRASES = {
  startWord: "Từ này bắt đầu bằng chữ nào?",
  startPic: "Hình nào bắt đầu bằng chữ",
  readAs: "Chữ nào đọc là"
};
export const snd = l => (l === "q" ? "cu" : l + "ờ");   // cách đọc âm: bờ, cờ, chờ...
// Tên file âm thanh (tạo bằng tools/generate_audio*.py)
export const sndFile = c => `audio/sounds/s-${c}.mp3`;          // âm của chữ
export const wordFile = (c, j) => `audio/sounds/w-${c}${j + 1}.mp3`; // từ minh họa thứ j của chữ
export const phraseFile = k => `audio/sounds/p-${k}.mp3`;

export function lessonByKey(key) {
  const g = SOUND_GROUPS.find(g => g.id === key[0]), [x, y, desc] = g.lessons[+key.slice(1) - 1];
  return { x, y, desc, words: [W[x], W[y]], same: SAME_SOUND.has(`${x}-${y}`) || SAME_SOUND.has(`${y}-${x}`) };
}

const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)], shuf = a => [...a].sort(() => Math.random() - .5);
// Mỗi câu có clips = [[file âm thanh, văn bản dự phòng], ...] để app phát lần lượt
export function soundQuestion(key) {
  const L = lessonByKey(key), i = rnd(2), c = [L.x, L.y][i], t = rnd(L.same ? 2 : 3), base = { emoji: "", lang: "vi-VN" };
  const sound = [sndFile(c), snd(c)];
  if (t === 0) {                       // nhìn hình → chọn chữ đầu
    const j = rnd(L.words[i].length), [w, e] = L.words[i][j];
    return { ...base, prompt: `Từ “${w}” bắt đầu bằng chữ nào?`, emoji: e, options: [L.x, L.y], answer: c, speak: `${w}. ${PHRASES.startWord}`,
      clips: [[wordFile(c, j), w], [phraseFile("startWord"), PHRASES.startWord]] };
  }
  if (t === 1) {                       // nghe chữ → chọn hình
    const right = pick(L.words[i])[1];
    return { ...base, prompt: `Hình nào bắt đầu bằng chữ “${c}”?`, options: shuf([right, ...shuf(L.words[1 - i].map(w => w[1])).slice(0, 3)]), answer: right,
      speak: `${PHRASES.startPic} ${snd(c)}?`, clips: [[phraseFile("startPic"), PHRASES.startPic], sound] };
  }
  return { ...base, prompt: `Chữ nào đọc là “${snd(c)}”?`, emoji: "🔊", options: [L.x, L.y], answer: c,   // nghe âm → chọn chữ
    speak: `${PHRASES.readAs} ${snd(c)}`, clips: [[phraseFile("readAs"), PHRASES.readAs], sound] };
}