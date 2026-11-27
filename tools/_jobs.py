"""Danh sách file âm thanh cần tạo, đọc từ public/js/alphabet.js và public/js/sounds.js (dùng chung cho 2 script)."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public/audio"

def snd(l):  # phải khớp hàm snd() trong sounds.js
    return "cu" if l == "q" else l + "ờ"

def alphabet_jobs():
    t = (ROOT / "public/js/alphabet.js").read_text(encoding="utf8")
    items = re.findall(r'id:\s*"([^"]+)".*?\bn:\s*"([^"]*)".*?\bw:\s*"([^"]*)"', t)
    if len(items) != 29:
        sys.exit(f"alphabet.js: đọc được {len(items)} chữ (cần 29)")
    return [j for i, n, w in items for j in ((OUT / "letters" / f"{i}.mp3", n), (OUT / "words" / f"{i}.mp3", w))]

def sounds_jobs():
    t = (ROOT / "public/js/sounds.js").read_text(encoding="utf8")
    w0 = t.index("const W = {"); block = t[w0:t.index("};", w0)]
    words = [(k, re.findall(r'\["([^"]+)",\s*"[^"]*"\]', body))
             for k, body in re.findall(r'(\w+):\s*\[((?:\s*\["[^"]+",\s*"[^"]*"\]\s*,?)+)\s*\]', block)]
    p0 = t.index("export const PHRASES"); phrases = re.findall(r'(\w+):\s*"([^"]+)"', t[p0:t.index("};", p0)])
    if len(words) < 20 or len(phrases) != 3:
        sys.exit(f"sounds.js: đọc được {len(words)} chữ, {len(phrases)} câu dẫn — kiểm tra lại định dạng")
    d = OUT / "sounds"
    jobs = [(d / f"s-{k}.mp3", snd(k)) for k, _ in words]
    jobs += [(d / f"w-{k}{n}.mp3", w) for k, ws in words for n, w in enumerate(ws, 1)]
    jobs += [(d / f"p-{k}.mp3", v) for k, v in phrases]
    return jobs

def build_jobs(which="all", only=None):
    jobs = (alphabet_jobs() if which in ("alphabet", "all") else []) + (sounds_jobs() if which in ("sounds", "all") else [])
    return [(p, t) for p, t in jobs if not only or p.stem in only]
