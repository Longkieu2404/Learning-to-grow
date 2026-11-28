#!/usr/bin/env python3
"""Tạo file âm thanh (mp3) cho bảng chữ cái bằng giọng AI tiếng Việt của Microsoft (edge-tts).
Không cần khóa API. Chạy MỘT lần, sau đó web chỉ phát file có sẵn nên mọi thiết bị nghe giống nhau.

Cài đặt:   pip install edge-tts
Chạy hết:  python tools/generate_audio.py
Chỉ vài chữ (tạo lại):  python tools/generate_audio.py --only x y --force
Xem trước (không tạo):  python tools/generate_audio.py --dry-run
Đổi giọng nam:          python tools/generate_audio.py --voice vi-VN-NamMinhNeural --force
Kết quả: public/audio/letters/<id>.mp3 (tên chữ) và public/audio/words/<id>.mp3 (từ minh họa).
Đọc tên chữ & từ lấy từ public/js/alphabet.js (trường n và w) — sửa ở đó rồi chạy lại với --force.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _jobs import build_jobs
import argparse, asyncio, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public/js/alphabet.js"
OUT = ROOT / "public/audio"

def load():
    text = SRC.read_text(encoding="utf8")
    items = re.findall(r'id:\s*"([^"]+)".*?\bn:\s*"([^"]*)".*?\bw:\s*"([^"]*)"', text)
    if len(items) != 29:
        sys.exit(f"Đọc được {len(items)} chữ (cần 29) — kiểm tra lại {SRC}")
    return items

async def make(text, path, voice, rate, retries=3):
    import edge_tts
    for k in range(retries):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(path))
            return True
        except Exception as e:
            print(f"   lỗi ({e}), thử lại {k + 1}/{retries}")
            await asyncio.sleep(2)
    return False

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="vi-VN-HoaiMyNeural")
    ap.add_argument("--rate", default="-20%", help="tốc độ đọc, ví dụ -20%% = chậm hơn 20%%")
    ap.add_argument("--set", choices=["alphabet", "sounds", "van", "spell", "all"], default="all", help="nhóm cần tạo (mặc định: all, file đã có sẽ được bỏ qua)")
    ap.add_argument("--only", nargs="*", help="chỉ các file này (tên không có .mp3), ví dụ: x aw s-b w-ch1 p-readAs")
    ap.add_argument("--force", action="store_true", help="tạo lại cả file đã có")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    jobs = build_jobs(args.set, args.only)
    failed = []
    for path, text in jobs:
        if path.exists() and not args.force:
            print(f"bỏ qua  {path.relative_to(ROOT)}")
            continue
        print(f"tạo     {path.relative_to(ROOT)}  ←  “{text}”")
        if args.dry_run:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        if not await make(text, path, args.voice, args.rate):
            failed.append(path.name)
    print("\nXong." if not failed else f"\nChưa tạo được: {', '.join(failed)} — chạy lại lệnh để thử tiếp.")

asyncio.run(main())
