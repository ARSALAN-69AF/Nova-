import io
import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, session, stream_with_context
from flask_cors import CORS
from google import genai
from openai import OpenAI
from pypdf import PdfReader
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = DATABASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATABASE_DIR / "chat_app.db"

load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "nova-dev-secret")
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

AI_PROVIDER = os.getenv("AI_PROVIDER", "demo").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODELS = {
    "demo": "demo-local",
    "openai": "gpt-4o-mini",
    "groq": "llama-3.1-8b-instant",
    "gemini": "gemini-2.5-flash",
}
AI_MODEL = os.getenv("AI_MODEL") or DEFAULT_MODELS.get(AI_PROVIDER, "gpt-4o-mini")


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def column_exists(connection: sqlite3.Connection, table: str, column: str) -> bool:
    rows = connection.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row["name"] == column for row in rows)


def init_db() -> None:
    connection = get_db_connection()
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            feedback TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER,
            filename TEXT NOT NULL,
            content_type TEXT,
            extracted_text TEXT,
            storage_path TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        );
        """
    )

    if not column_exists(connection, "chats", "user_id"):
        connection.execute("ALTER TABLE chats ADD COLUMN user_id INTEGER")
    if not column_exists(connection, "chats", "pinned"):
        connection.execute("ALTER TABLE chats ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0")
    if not column_exists(connection, "messages", "feedback"):
        connection.execute("ALTER TABLE messages ADD COLUMN feedback TEXT")

    connection.commit()
    connection.close()


def current_user_id() -> int | None:
    return session.get("user_id")


def serialize_chat(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "title": row["title"],
        "pinned": bool(row["pinned"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def serialize_message(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "chat_id": row["chat_id"],
        "role": row["role"],
        "content": row["content"],
        "feedback": row["feedback"],
        "created_at": row["created_at"],
    }


def serialize_attachment(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "chat_id": row["chat_id"],
        "filename": row["filename"],
        "content_type": row["content_type"],
        "extracted_text": row["extracted_text"],
        "created_at": row["created_at"],
    }


def normalize_title(text: str) -> str:
    compact = " ".join(text.strip().split())
    words = compact.split(" ")
    if len(words) > 8:
        compact = " ".join(words[:8])
    return compact[:72] + ("..." if len(compact) > 72 else "") or "New Chat"


def scoped_chat_where() -> tuple[str, tuple]:
    user_id = current_user_id()
    if user_id is None:
        return "user_id IS NULL", ()
    return "user_id = ?", (user_id,)


def get_chat(chat_id: int) -> dict | None:
    connection = get_db_connection()
    where_clause, where_params = scoped_chat_where()
    chat = connection.execute(
        f"""
        SELECT id, user_id, title, pinned, created_at, updated_at
        FROM chats
        WHERE id = ? AND {where_clause}
        """,
        (chat_id, *where_params),
    ).fetchone()
    if not chat:
        connection.close()
        return None

    messages = connection.execute(
        """
        SELECT id, chat_id, role, content, feedback, created_at
        FROM messages
        WHERE chat_id = ?
        ORDER BY id ASC
        """,
        (chat_id,),
    ).fetchall()
    attachments = connection.execute(
        """
        SELECT id, chat_id, filename, content_type, extracted_text, created_at
        FROM attachments
        WHERE chat_id = ?
        ORDER BY id ASC
        """,
        (chat_id,),
    ).fetchall()
    connection.close()

    return {
        "chat": serialize_chat(chat),
        "messages": [serialize_message(message) for message in messages],
        "attachments": [serialize_attachment(attachment) for attachment in attachments],
    }


def create_chat(initial_title: str) -> int:
    connection = get_db_connection()
    cursor = connection.execute(
        "INSERT INTO chats (user_id, title) VALUES (?, ?)",
        (current_user_id(), normalize_title(initial_title)),
    )
    chat_id = int(cursor.lastrowid)
    connection.commit()
    connection.close()
    return chat_id


def touch_chat(chat_id: int) -> None:
    connection = get_db_connection()
    connection.execute(
        "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (chat_id,),
    )
    connection.commit()
    connection.close()


def save_message(chat_id: int, role: str, content: str) -> int:
    connection = get_db_connection()
    cursor = connection.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)",
        (chat_id, role, content),
    )
    connection.execute(
        "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (chat_id,),
    )
    connection.commit()
    message_id = int(cursor.lastrowid)
    connection.close()
    return message_id


def save_attachment(chat_id: int | None, filename: str, content_type: str, extracted_text: str, storage_path: str) -> dict:
    connection = get_db_connection()
    cursor = connection.execute(
        """
        INSERT INTO attachments (chat_id, filename, content_type, extracted_text, storage_path)
        VALUES (?, ?, ?, ?, ?)
        """,
        (chat_id, filename, content_type, extracted_text, storage_path),
    )
    attachment_id = int(cursor.lastrowid)
    row = connection.execute(
        """
        SELECT id, chat_id, filename, content_type, extracted_text, created_at
        FROM attachments
        WHERE id = ?
        """,
        (attachment_id,),
    ).fetchone()
    connection.commit()
    connection.close()
    return serialize_attachment(row)


def build_ai_messages(messages: list[dict], response_style: str = "balanced") -> list[dict]:
    system_prompt = (
        "You are a helpful AI assistant in a ChatGPT-style application. "
        "Use markdown when it helps readability, keep code blocks well formatted, "
        "and answer clearly."
    )
    if response_style == "concise":
        system_prompt += " Keep responses concise."
    elif response_style == "teacher":
        system_prompt += " Explain concepts step by step like a supportive teacher."
    return [{"role": "system", "content": system_prompt}, *messages]


def build_gemini_prompt(messages: list[dict]) -> str:
    lines = [
        "System: You are a helpful AI assistant in a ChatGPT-style application.",
        "System: Use markdown when it helps readability, keep code blocks well formatted, and answer clearly.",
    ]
    for message in messages:
        lines.append(f"{message['role'].capitalize()}: {message['content']}")
    lines.append("Assistant:")
    return "\n\n".join(lines)


def demo_response_text(user_message: str) -> str:
    lowered = user_message.lower()
    if "react" in lowered:
        return (
            "### React response\n\n"
            "Here is a clean approach:\n\n"
            "```jsx\n"
            "function Message({ children }) {\n"
            "  return <div className=\"rounded-2xl p-4\">{children}</div>;\n"
            "}\n"
            "```\n\n"
            "Keep the UI split into a sidebar, scrollable transcript, and sticky composer."
        )
    if "python" in lowered or "flask" in lowered:
        return (
            "### Backend response\n\n"
            "Use Flask for the API, SQLite for persistence, and store every message with a `chat_id`.\n\n"
            "- Save the user message first\n"
            "- Rebuild full history for the model\n"
            "- Stream the assistant response back to the frontend"
        )
    return (
        "Demo mode is active, so this is a local markdown reply.\n\n"
        f"**You said:** {user_message}\n\n"
        "You can keep building and testing the full chat experience without a live API key."
    )


def get_openai_client() -> OpenAI:
    if AI_PROVIDER == "groq":
        if not GROQ_API_KEY:
            raise RuntimeError("Missing GROQ_API_KEY for Groq provider.")
        return OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

    if AI_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise RuntimeError("Missing OPENAI_API_KEY for OpenAI provider.")
        return OpenAI(api_key=OPENAI_API_KEY)

    raise RuntimeError("AI provider is set to demo mode.")


def get_gemini_client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY for Gemini provider.")
    return genai.Client(api_key=GEMINI_API_KEY)


def stream_demo_reply(text: str) -> Generator[str, None, None]:
    for token in text.split(" "):
        yield token + " "
        time.sleep(0.02)


def stream_model_reply(messages: list[dict]) -> Generator[str, None, None]:
    if AI_PROVIDER == "gemini":
        client = get_gemini_client()
        stream = client.models.generate_content_stream(
            model=AI_MODEL,
            contents=build_gemini_prompt(messages),
        )
        for chunk in stream:
            text = getattr(chunk, "text", None) or ""
            if text:
                yield text
        return

    client = get_openai_client()
    stream = client.chat.completions.create(
        model=AI_MODEL,
        messages=messages,
        temperature=0.7,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield delta


def event_payload(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


def extract_text_from_upload(file_storage) -> tuple[str, str]:
    filename = secure_filename(file_storage.filename or "upload")
    content_type = file_storage.mimetype or "application/octet-stream"
    extension = Path(filename).suffix.lower()
    raw_bytes = file_storage.read()
    file_storage.stream.seek(0)

    save_path = UPLOAD_DIR / f"{int(time.time() * 1000)}-{filename}"
    save_path.write_bytes(raw_bytes)

    if extension in {".txt", ".md", ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".csv"}:
        extracted = raw_bytes.decode("utf-8", errors="ignore")
    elif extension == ".pdf":
        reader = PdfReader(io.BytesIO(raw_bytes))
        extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif extension in {".png", ".jpg", ".jpeg", ".webp"}:
        extracted = (
            f"Image uploaded: {filename}\n"
            f"Content type: {content_type}\n"
            "Image analysis is not fully enabled in this local build, but the file metadata is attached."
        )
    else:
        extracted = f"Uploaded file: {filename}\nType: {content_type}"

    return extracted[:20000], str(save_path)


@app.get("/api/health")
def health() -> Response:
    return jsonify({"status": "ok", "provider": AI_PROVIDER, "model": AI_MODEL})


@app.get("/api/auth/me")
def auth_me() -> Response:
    user_id = current_user_id()
    if not user_id:
        return jsonify({"user": None})

    connection = get_db_connection()
    user = connection.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    connection.close()
    return jsonify({"user": dict(user) if user else None})


@app.post("/api/auth/register")
def auth_register() -> Response:
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    connection = get_db_connection()
    try:
        cursor = connection.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, generate_password_hash(password)),
        )
        connection.commit()
        user_id = int(cursor.lastrowid)
    except sqlite3.IntegrityError:
        connection.close()
        return jsonify({"error": "Email already exists"}), 409

    session["user_id"] = user_id
    user = connection.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    connection.close()
    return jsonify({"user": dict(user)}), 201


@app.post("/api/auth/login")
def auth_login() -> Response:
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    connection = get_db_connection()
    user = connection.execute(
        "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
        (email,),
    ).fetchone()
    connection.close()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    return jsonify(
        {
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "created_at": user["created_at"],
            }
        }
    )


@app.post("/api/auth/logout")
def auth_logout() -> Response:
    session.pop("user_id", None)
    return jsonify({"success": True})


@app.get("/api/chats")
def list_chats() -> Response:
    query = str(request.args.get("q", "")).strip().lower()
    where_clause, where_params = scoped_chat_where()
    connection = get_db_connection()
    sql = f"""
        SELECT id, user_id, title, pinned, created_at, updated_at
        FROM chats
        WHERE {where_clause}
    """
    params = list(where_params)
    if query:
        sql += " AND lower(title) LIKE ?"
        params.append(f"%{query}%")
    sql += " ORDER BY pinned DESC, datetime(updated_at) DESC, id DESC"

    chats = connection.execute(sql, params).fetchall()
    connection.close()
    return jsonify({"chats": [serialize_chat(chat) for chat in chats]})


@app.delete("/api/chats")
def clear_chats() -> Response:
    where_clause, where_params = scoped_chat_where()
    connection = get_db_connection()
    connection.execute(f"DELETE FROM chats WHERE {where_clause}", where_params)
    connection.commit()
    connection.close()
    return jsonify({"success": True})


@app.get("/api/chats/<int:chat_id>")
def get_chat_by_id(chat_id: int) -> Response:
    chat_data = get_chat(chat_id)
    if not chat_data:
        return jsonify({"error": "Chat not found"}), 404
    return jsonify(chat_data)


@app.post("/api/chats")
def create_empty_chat() -> Response:
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "New Chat")).strip() or "New Chat"
    connection = get_db_connection()
    cursor = connection.execute(
        "INSERT INTO chats (user_id, title) VALUES (?, ?)",
        (current_user_id(), title),
    )
    chat_id = int(cursor.lastrowid)
    connection.commit()
    connection.close()
    return jsonify(get_chat(chat_id)), 201


@app.patch("/api/chats/<int:chat_id>")
def update_chat(chat_id: int) -> Response:
    payload = request.get_json(silent=True) or {}
    connection = get_db_connection()
    chat = get_chat(chat_id)
    if not chat:
        connection.close()
        return jsonify({"error": "Chat not found"}), 404

    title = payload.get("title")
    pinned = payload.get("pinned")
    if title is not None:
        title = str(title).strip()
        if not title:
            connection.close()
            return jsonify({"error": "Title is required"}), 400
        connection.execute(
            "UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (title, chat_id),
        )
    if pinned is not None:
        connection.execute(
            "UPDATE chats SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (1 if pinned else 0, chat_id),
        )
    connection.commit()
    connection.close()
    return jsonify(get_chat(chat_id)["chat"])


@app.delete("/api/chats/<int:chat_id>")
def delete_chat(chat_id: int) -> Response:
    chat = get_chat(chat_id)
    if not chat:
        return jsonify({"error": "Chat not found"}), 404

    connection = get_db_connection()
    connection.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    connection.commit()
    connection.close()
    return jsonify({"success": True})


@app.post("/api/uploads")
def upload_file() -> Response:
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "File is required"}), 400

    chat_id = request.form.get("chat_id")
    chat_id = int(chat_id) if chat_id else None
    extracted_text, storage_path = extract_text_from_upload(file)
    attachment = save_attachment(
        chat_id,
        secure_filename(file.filename),
        file.mimetype or "application/octet-stream",
        extracted_text,
        storage_path,
    )
    return jsonify({"attachment": attachment})


@app.patch("/api/messages/<int:message_id>/feedback")
def message_feedback(message_id: int) -> Response:
    payload = request.get_json(silent=True) or {}
    feedback = str(payload.get("feedback", "")).strip().lower()
    if feedback not in {"up", "down", ""}:
        return jsonify({"error": "Feedback must be up, down, or empty"}), 400

    connection = get_db_connection()
    cursor = connection.execute(
        "UPDATE messages SET feedback = ? WHERE id = ?",
        (feedback or None, message_id),
    )
    connection.commit()
    connection.close()
    if cursor.rowcount == 0:
        return jsonify({"error": "Message not found"}), 404
    return jsonify({"success": True, "feedback": feedback or None})


@app.post("/api/chat")
@app.post("/chat")
def chat() -> Response:
    payload = request.get_json(silent=True) or {}
    user_message = str(payload.get("message", "")).strip()
    chat_id = payload.get("chat_id")
    response_style = str(payload.get("response_style", "balanced")).strip().lower()
    attachments = payload.get("attachments") or []

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    if chat_id is None:
        chat_id = create_chat(user_message)
    else:
        chat_id = int(chat_id)
        if not get_chat(chat_id):
            return jsonify({"error": "Chat not found"}), 404

    attachment_context = ""
    if attachments:
        pieces = [
            f"[Attachment: {attachment.get('filename', 'file')}]\n{attachment.get('extracted_text', '')}"
            for attachment in attachments
        ]
        attachment_context = "\n\n".join(piece for piece in pieces if piece.strip())

    stored_user_message = user_message
    if attachment_context:
        stored_user_message += f"\n\nAttached context:\n{attachment_context}"

    save_message(chat_id, "user", stored_user_message)
    chat_data = get_chat(chat_id)
    model_messages = build_ai_messages(
        [
            {"role": message["role"], "content": message["content"]}
            for message in chat_data["messages"]
        ],
        response_style=response_style,
    )

    @stream_with_context
    def generate() -> Generator[str, None, None]:
        assistant_text = ""
        try:
            yield event_payload("meta", {"chat_id": chat_id})

            if AI_PROVIDER == "demo":
                stream_iterable = stream_demo_reply(demo_response_text(user_message))
            else:
                stream_iterable = stream_model_reply(model_messages)

            for chunk in stream_iterable:
                assistant_text += chunk
                yield event_payload("token", {"content": chunk})

            message_id = save_message(chat_id, "assistant", assistant_text.strip())
            touch_chat(chat_id)
            yield event_payload("done", {"chat_id": chat_id, "message_id": message_id})
        except Exception as exc:
            yield event_payload("error", {"message": str(exc)})

    return Response(generate(), mimetype="text/event-stream")


init_db()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        debug=True,
        threaded=True,
    )
