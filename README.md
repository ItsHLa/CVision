# CVision

CVision is an AI-powered CV and career analysis platform. Users upload a resume, paste a job description, or ask career questions through a chat interface — and receive real-time streaming feedback. No sign-up required.

## Key Components

### Orchestrator Agent Pipeline

The system routes messages through an agent pipeline coordinated by `server/routes/chat_router.py`:

- **Text messages** → `agent_handler.py` → `CVisionAgent` → Flowise AI (SSE streaming)
- **File uploads** → Celery `cv_analyzer` task → n8n Parser API (PDF/DOCX parsing) → `CVisionAgent` → Flowise AI

The `CVisionAgent` (`server/agent/cvision_agent.py`) wraps external AI services — Flowise for LLM-powered analysis and n8n for document parsing — streaming results back chunk by chunk.

### Redis Stream (Message Buffer)

Redis Streams decouple the producer (agent/Celery) from the consumer (WebSocket):

- **Producers** — `agent_handler.py` writes each SSE chunk from Flowise to `task_{task_id}` via `XADD`; the Celery task writes status updates and parsed results
- **Consumer** — the WebSocket handler blocks on `XREAD` polling, forwarding each event to the frontend
- **Stream pattern** — `task_{task_id}` per session; event fields: `{event, data}`

Uses Upstash (serverless Redis) with sync Redis for writing and async Redis for the polling loop.

### WebSocket (Real-Time Streaming)

- **Endpoint:** `ws://host:port/ws/v1/chat/`
- **Protocol:** Bidirectional JSON messages
- **Flow:** Client sends text/binary → server writes events to Redis Stream → server polls and forwards to client → client renders tokens incrementally
- **Frontend** — `ChatClient` class in `frontend/chat-core.js` manages auto-reconnect, stream bubble accumulation, and file-to-base64 conversion

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** FastAPI (Python)
- **WebSocket:** Real-time bidirectional streaming
- **Message broker:** Redis Streams (Upstash)
- **Background workers:** Celery (Redis broker)
- **External AI:** Flowise (LLM), n8n (document parsing)