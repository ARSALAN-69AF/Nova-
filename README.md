# Nova Chat

A full-stack AI chat app with a React + Tailwind frontend, Flask backend, SQLite chat memory, streaming responses, markdown rendering, and ChatGPT-style layout.

## Folder structure

```text
/frontend   React + Tailwind app
/backend    Flask API
/database   SQLite database file
```

## Features

- Sidebar with saved chat history
- New chat, rename chat, pin chat, search history, and delete chat
- Chat title auto-generated from the first user message
- Persistent SQLite storage
- Streaming assistant replies
- Markdown rendering with code blocks
- Copy button, thumbs up/down feedback, regenerate, and edit-last-user-message actions
- Sticky bottom composer
- File upload support for text, code, PDF, and basic image metadata
- Optional account registration/login with session-backed private chats
- Settings panel for theme, response style, provider/model view, and clear-all
- Demo mode without a live API key
- OpenAI, Groq, or Gemini provider support through backend env vars

## Backend setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Copy `.env.example` to `.env`.
4. Set one of these:
   - `AI_PROVIDER=demo`
   - `AI_PROVIDER=openai` with `OPENAI_API_KEY`
   - `AI_PROVIDER=groq` with `GROQ_API_KEY`
   - `AI_PROVIDER=gemini` with `GEMINI_API_KEY`
5. Optional: set `AI_MODEL` only if you want to override the provider default.
   - OpenAI default: `gpt-4o-mini`
   - Groq default: `llama-3.1-8b-instant`
   - Gemini default: `gemini-2.5-flash`
6. Run the backend:

```bash
python backend/app.py
```

The Flask API runs on `http://localhost:8000`.

## Frontend setup

1. Open the `frontend` folder.
2. Install packages:

```bash
npm install
```

3. Start the React dev server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to Flask.

## Database schema

### chats

- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER NULL
- `title` TEXT NOT NULL
- `pinned` INTEGER
- `created_at` TEXT
- `updated_at` TEXT

### messages

- `id` INTEGER PRIMARY KEY
- `chat_id` INTEGER REFERENCES chats(id) ON DELETE CASCADE
- `role` TEXT CHECK user/assistant/system
- `content` TEXT NOT NULL
- `feedback` TEXT
- `created_at` TEXT

### users

- `id` INTEGER PRIMARY KEY
- `name` TEXT
- `email` TEXT UNIQUE
- `password_hash` TEXT
- `created_at` TEXT

## API routes

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/chats`
- `DELETE /api/chats`
- `GET /api/chats/:id`
- `POST /api/chats`
- `PATCH /api/chats/:id`
- `DELETE /api/chats/:id`
- `POST /api/uploads`
- `PATCH /api/messages/:id/feedback`
- `POST /api/chat` streaming response endpoint

## Streaming behavior

`POST /api/chat` streams server-sent style events over `text/event-stream`.

Events:

- `meta` returns `chat_id`
- `token` returns assistant text chunks
- `done` marks completion
- `error` returns a stream error message

## Deployment

### Frontend on Vercel

- Import the `frontend` folder as a Vite project.
- Set `VITE_API_BASE_URL` to your deployed backend URL.
- Build command: `npm run build`
- Output directory: `dist`

### Backend on Render or Railway

- Deploy the `backend` folder as a Python web service.
- Install command: `pip install -r backend/requirements.txt`
- Start command: `python backend/app.py`
- Add environment variables from `.env.example`
- Persist the `database` directory if your host supports attached disks or volumes

## Notes

- API keys stay only on the backend.
- Demo mode is useful for frontend work before connecting a live model.
- To switch from demo mode to real AI, update `.env`, restart the Flask backend, and keep the frontend running as usual.
- If you pull these latest changes, rerun `pip install -r backend/requirements.txt` because PDF upload support now uses `pypdf`.
- If you want richer production streaming or title generation, you can later move to background tasks and model-generated summaries.
