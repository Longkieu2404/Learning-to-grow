"""Backend Python: tạo bài tập bằng AI cho bé 5-6 tuổi.
Chạy local:  pip install -r requirements.txt && python main.py
Biến môi trường: ANTHROPIC_API_KEY, GOOGLE_APPLICATION_CREDENTIALS (service account Firebase), ALLOWED_ORIGIN
"""
import json, os
import anthropic, firebase_admin
from firebase_admin import auth
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGIN", "*"))
firebase_admin.initialize_app()
client = anthropic.Anthropic()  # đọc ANTHROPIC_API_KEY
MODEL = os.getenv("AI_MODEL", "claude-haiku-5-5")

TOPICS = {
    "math": ("Toán: đếm 1-10, cộng trừ trong phạm vi 10, so sánh số, hình học đơn giản", "vi-VN"),
    "vi": ("Tiếng Việt: nhận biết chữ cái, vần đơn giản, ghép từ theo hình, chữ cái đầu của từ", "vi-VN"),
    "en": ("Tiếng Anh: từ vựng cơ bản (animals, colors, fruits, numbers) nhìn emoji chọn từ", "en-US"),
}

PROMPT = """Tạo {n} câu hỏi trắc nghiệm cho trẻ 5-6 tuổi. Chủ đề: {topic}.
Quy tắc: câu ngắn, vui, an toàn; dùng emoji làm hình minh họa; mỗi câu đúng 4 đáp án ngắn, 1 đáp án đúng nằm trong options.
Chỉ trả về JSON hợp lệ, không giải thích, dạng:
[{{"prompt":"...","emoji":"🍎🍎🍎","options":["2","3","4","5"],"answer":"3","speak":"câu để đọc to"}}]"""

@app.post("/api/generate")
def generate():
    try:
        auth.verify_id_token(request.headers.get("Authorization", "").removeprefix("Bearer "))
    except Exception:
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    subject = body.get("subject")
    if subject not in TOPICS:
        return jsonify(error="bad subject"), 400
    n = min(int(body.get("count", 5)), 10)
    topic, lang = TOPICS[subject]
    msg = client.messages.create(model=MODEL, max_tokens=1500,
                                 messages=[{"role": "user", "content": PROMPT.format(n=n, topic=topic)}])
    text = msg.content[0].text.strip().removeprefix("```json").removesuffix("```").strip()
    try:
        qs = [q for q in json.loads(text)
              if q.get("answer") in q.get("options", []) and len(q["options"]) >= 2]
    except (ValueError, AttributeError):
        return jsonify(error="ai_format"), 502
    for q in qs:
        q["lang"] = lang
    return jsonify(questions=qs)

if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 8080)))
