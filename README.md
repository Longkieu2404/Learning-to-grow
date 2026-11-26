# Bé Học Vui — phần mềm học cho trẻ 5-6 tuổi (Toán, Tiếng Việt, Tiếng Anh)

## Cấu trúc
```
public/            Frontend (HTML/CSS/JS) - chạy trên máy tính & điện thoại
  index.html       4 màn hình: đăng nhập, trang chủ, bài tập, kết quả
  css/style.css    Giao diện (nút lớn, màu tươi, hiệu ứng)
  js/config.js     Cấu hình Firebase + địa chỉ backend  <-- cần điền
  js/firebase.js   Đăng nhập/đăng ký, lưu sao & tiến độ (Firestore)
  js/exercises.js  Tạo bài tập (có sẵn + gọi AI)
  js/app.js        Điều khiển chính, giọng đọc, confetti
backend/           Python (Flask) gọi AI tạo bài tập, xác thực token Firebase
firebase.json, firestore.rules
```

## Chạy thử
1. Tạo project Firebase → bật **Authentication (Email/Password)** và **Firestore**.
2. Dán cấu hình web app vào `public/js/config.js`.
3. Chạy frontend: `cd public && python -m http.server 8000` → mở http://localhost:8000
   (chưa cần backend: bài tập sẽ tạo sẵn trong trình duyệt).
4. Bật AI: `cd backend && pip install -r requirements.txt`, đặt `ANTHROPIC_API_KEY` và
   `GOOGLE_APPLICATION_CREDENTIALS`, chạy `python main.py`, rồi đặt `API_BASE="http://localhost:8080"`.

## Âm thanh bảng chữ cái (giống nhau trên mọi thiết bị)
Web phát file mp3 trong `public/audio/letters/` (tên chữ) và `public/audio/words/` (từ minh họa);
thiếu file nào thì tự dùng giọng của trình duyệt. Tạo file một lần bằng một trong hai script (cách đọc lấy từ `n`, `w` trong `public/js/alphabet.js`):
- Google Cloud TTS (dùng API key): đặt biến môi trường `GOOGLE_API_KEY` rồi `python tools/generate_audio_google.py`
- Miễn phí, không cần khóa: `pip install edge-tts` rồi `python tools/generate_audio.py`
Tạo lại vài chữ: thêm `--only x aw --force`. Xem thêm hướng dẫn ở đầu mỗi script. Không đưa API key lên GitHub.

## Triển khai
- Frontend: `firebase deploy --only hosting,firestore` (hoặc GitHub Pages).
- Backend: Cloud Run / Render dùng `backend/Dockerfile`. **Không** để API key trong code frontend.

## Việc nên làm tiếp
Thêm âm thanh/ảnh minh họa riêng, nhiều dạng bài (nối, kéo thả, tập tô chữ), báo cáo cho phụ huynh, nhiều hồ sơ bé trong 1 tài khoản, GitHub Actions tự deploy.
