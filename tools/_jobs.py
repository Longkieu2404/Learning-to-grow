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

_VID = str.maketrans({"ă": "aw", "â": "aa", "ê": "ee", "ô": "oo", "ơ": "ow", "ư": "uw"})   # phải khớp vid() trong van.js

def van_jobs():
    t = (ROOT / "public/js/van.js").read_text(encoding="utf8")
    v0 = t.index("const V = {"); block = t[v0:t.index("};", v0)]
    vans = [(k, re.findall(r'\["([^"]+)",\s*"[^"]*"\]', body))
            for k, body in re.findall(r'"([^"]+)":\s*\[((?:\s*\["[^"]+",\s*"[^"]*"\]\s*,?)+)\s*\]', block)]
    p0 = t.index("export const VAN_PHRASES"); phrases = re.findall(r'(\w+):\s*"([^"]+)"', t[p0:t.index("};", p0)])
    if len(vans) < 40 or len(phrases) != 3:
        sys.exit(f"van.js: đọc được {len(vans)} vần, {len(phrases)} câu dẫn — kiểm tra lại định dạng")
    s0 = t.index("export const VAN_SAY"); say = dict(re.findall(r'"([^"]+)":\s*"([^"]+)"', t[s0:t.index("};", s0)]))   # cách đọc riêng của vần
    d = OUT / "van"
    jobs = [(d / f"v-{k.translate(_VID)}.mp3", say.get(k, k)) for k, _ in vans]
    jobs += [(d / f"w-{k.translate(_VID)}{n}.mp3", w.replace("[", "").replace("]", "")) for k, ws in vans for n, w in enumerate(ws, 1)]
    jobs += [(d / f"p-{k}.mp3", v) for k, v in phrases]
    return jobs

TONE_NAMES = ["ngang", "huyền", "sắc", "hỏi", "ngã", "nặng"]   # phải khớp TONES trong spell.js

def _strip(x):
    import unicodedata
    d = unicodedata.normalize("NFD", x)
    return unicodedata.normalize("NFC", "".join(c for c in d if c not in "\u0300\u0301\u0309\u0303\u0323"))

def spell_jobs():
    """Đánh vần: âm đầu (o-), tiếng chưa dấu (b-), tên thanh (t-), câu dẫn (p-). Âm vần và từ dùng lại file của phần vần."""
    t = (ROOT / "public/js/van.js").read_text(encoding="utf8")
    v0 = t.index("const V = {"); block = t[v0:t.index("};", v0)]
    vans = [(k, re.findall(r'\["([^"]+)",\s*"[^"]*"\]', body))
            for k, body in re.findall(r'"([^"]+)":\s*\[((?:\s*\["[^"]+",\s*"[^"]*"\]\s*,?)+)\s*\]', block)]
    d = OUT / "spell"; onsets = []; jobs = []
    for k, ws in vans:
        for n, w in enumerate(ws, 1):
            m = re.fullmatch(r'([^\[\] ]+)\[([^\]]+)\]', w)       # cùng điều kiện với spell.js
            if not m or _strip(m.group(2)) != k:
                continue
            if m.group(1) not in onsets:
                onsets.append(m.group(1))
            jobs.append((d / f"b-{k.translate(_VID)}{n}.mp3", m.group(1) + k))
    jobs = [(d / f"o-{o.replace('đ', 'dd')}.mp3", snd(o)) for o in onsets] + jobs
    jobs += [(d / f"t-{i}.mp3", n) for i, n in enumerate(TONE_NAMES, 1)]
    s0 = (ROOT / "public/js/spell.js").read_text(encoding="utf8"); p0 = s0.index("export const SPELL_PHRASES")
    ph = re.findall(r'(\w+):\s*"([^"]+)"', s0[p0:s0.index("};", p0)])
    if len(ph) != 2 or len(jobs) < 150:
        sys.exit(f"spell: đọc được {len(jobs)} file, {len(ph)} câu dẫn — kiểm tra lại van.js / spell.js")
    return jobs + [(d / f"p-{k}.mp3", v) for k, v in ph]

def build_jobs(which="all", only=None):
    jobs = (alphabet_jobs() if which in ("alphabet", "all") else []) + (sounds_jobs() if which in ("sounds", "all") else []) + (van_jobs() if which in ("van", "all") else []) + (spell_jobs() if which in ("spell", "all") else [])
    return [(p, t) for p, t in jobs if not only or p.stem in only]
