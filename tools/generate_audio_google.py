#!/usr/bin/env python3
"""Tạo file âm thanh (mp3) cho bảng chữ cái bằng Google Cloud Text-to-Speech (dùng API key).
Chỉ dùng thư viện có sẵn của Python, không cần cài thêm gì.

1) Đặt khóa vào biến môi trường (KHÔNG ghi khóa vào code, KHÔNG đưa lên GitHub):
     Windows PowerShell:  $env:GOOGLE_API_KEY="khóa-của-bạn"
     Mac/Linux:           export GOOGLE_API_KEY="khóa-của-bạn"
2) Xem các giọng tiếng Việt hiện có:  python tools/generate_audio_google.py --list-voices
3) Tạo hết 58 file:                   python tools/generate_audio_google.py
   Tạo lại vài chữ:                   python tools/generate_audio_google.py --only x aw --force
   Đổi giọng (ví dụ giọng nam):       python tools/generate_audio_google.py --voice vi-VN-Neural2-D --force
Kết quả: public/audio/letters/<id>.mp3 và public/audio/words/<id>.mp3 (cách đọc lấy từ n, w trong public/js/alphabet.js).
"""
import argparse, base64, json, os, pathlib, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "public/js/alphabet.js", ROOT / "public/audio"
API = "https://texttospeech.googleapis.com/v1"

def load():
    items = re.findall(r'id:\s*"([^"]+)".*?\bn:\s*"([^"]*)".*?\bw:\s*"([^"]*)"', SRC.read_text(encoding="utf8"))
    if len(items) != 29:
        sys.exit(f"Đọc được {len(items)} chữ (cần 29) — kiểm tra lại {SRC}")
    return items

def call(path, key, body=None):
    url = f"{API}/{path}{'&' if '?' in path else '?'}key={urllib.parse.quote(key)}"
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf8", "replace")[:400]
        hint = {403: " → Kiểm tra: đã bật Cloud Text-to-Speech API, bật thanh toán (billing), và khóa không bị giới hạn sai API.",
                400: " → Kiểm tra lại khóa API hoặc tên giọng (--list-voices)."}.get(e.code, "")
        raise RuntimeError(f"HTTP {e.code}: {msg}{hint}")

def synth(text, voice, rate, key):
    body = {"input": {"text": text}, "voice": {"languageCode": "vi-VN", "name": voice},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate}}
    return base64.b64decode(call("text:synthesize", key, body)["audioContent"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="vi-VN-Neural2-A", help="mặc định: giọng nữ Neural2")
    ap.add_argument("--rate", type=float, default=0.8, help="tốc độ đọc 0.25–4.0 (1.0 = bình thường)")
    ap.add_argument("--only", nargs="*", help="chỉ các id này, ví dụ: x y aw")
    ap.add_argument("--force", action="store_true", help="tạo lại cả file đã có")
    ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    key = os.environ.get("GOOGLE_API_KEY", "")
    if not key and not a.dry_run:
        sys.exit("Chưa có khóa. Đặt biến môi trường GOOGLE_API_KEY (xem hướng dẫn ở đầu file).")
    if a.list_voices:
        for v in sorted(call("voices?languageCode=vi-VN", key).get("voices", []), key=lambda v: v["name"]):
            print(f'{v["name"]:28} {v["ssmlGender"]}')
        return

    jobs = []
    for id_, name, word in load():
        if a.only and id_ not in a.only:
            continue
        jobs += [(OUT / "letters" / f"{id_}.mp3", name), (OUT / "words" / f"{id_}.mp3", word)]
    failed = []
    for path, text in jobs:
        rel = path.relative_to(ROOT)
        if path.exists() and not a.force:
            print(f"bỏ qua  {rel}"); continue
        print(f"tạo     {rel}  ←  “{text}”")
        if a.dry_run: continue
        path.parent.mkdir(parents=True, exist_ok=True)
        for k in range(3):
            try:
                path.write_bytes(synth(text, a.voice, a.rate, key)); break
            except Exception as e:
                print(f"   lỗi: {e}")
                if "HTTP 403" in str(e) or "HTTP 400" in str(e): sys.exit(1)   # sai khóa/cấu hình: dừng ngay
                time.sleep(2)
        else:
            failed.append(path.name)
    print("\nXong." if not failed else f"\nChưa tạo được: {', '.join(failed)} — chạy lại lệnh để thử tiếp.")

main()
