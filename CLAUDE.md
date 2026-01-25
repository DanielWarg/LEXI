# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lexi is a voice-first AI assistant for makers and engineers. It's a hybrid local-first system with real-time voice I/O (Gemini 2.5 Native Audio), browser automation, CAD generation, 3D printer control, and smart home integration. The interface is primarily in Swedish.

## Development Commands

### Backend (Python)
```bash
# Run server (with auto-reload)
.venv/bin/uvicorn backend.server:app_socketio --host 0.0.0.0 --port 8000 --reload

# Tests
.venv/bin/pytest backend/tests/
.venv/bin/pytest backend/tests/test_filename.py
.venv/bin/pytest backend/tests/test_filename.py::test_function_name
```

### Frontend (React/TypeScript)
```bash
npm run dev              # Vite dev server (browser-only)
npm run dev:electron     # Electron + Vite dev server
npm run tauri dev        # Tauri 2.0 desktop app
npm run build            # TypeScript + Vite build
npm run lint             # ESLint
```

### Setup
```bash
# Backend
conda create -n lexi_v2 python=3.11 -y && conda activate lexi_v2
pip install -r requirements.txt
playwright install chromium

# Frontend
npm install

# Create .env with GEMINI_API_KEY
```

## Architecture

### Communication
Socket.IO bridges Python backend (port 8000) ↔ React frontend for real-time audio streaming, tool execution results, and status updates.

### Backend Entry Points
- `backend/server.py` - FastAPI + Socket.IO server, authentication, settings persistence
- `backend/lexi.py` - Main AI entity with Gemini 2.5 integration and audio loop

### Frontend Entry Points
- `src/main.tsx` - Vite entry
- `src/App.tsx` - Root component
- `src/context/SocketContext.tsx` - Global Socket.IO context (use `useSocket` hook)

### Agent Pattern
Each capability is a Python class in `backend/`:
- `cad_agent.py` - CAD generation (build123d)
- `web_agent.py` - Browser automation (Playwright)
- `printer_agent.py` - 3D printer control (OctoPrint/Moonraker/PrusaLink)
- `kasa_agent.py` - Smart home (TP-Link Kasa)
- `project_manager.py` - File/project organization

**Adding a new agent:**
1. Create `backend/<name>_agent.py` with async methods
2. Add tool schema to `backend/tools.py` or top of `lexi.py`
3. Import and instantiate in `Lexi.__init__()`
4. Add dispatch logic (elif) in `Lexi.receive_audio()`
5. Create UI component in `src/components/modules/<Name>View.tsx`

**Agent return values:** Return simple types (`str`, `dict`, `bool`, `None`), not exceptions. Wrap network calls in try/except.

### Audio Configuration
- Input: 16kHz, mono, 16-bit PCM
- Output: 24kHz, stereo, 16-bit PCM
- Model: `models/gemini-2.5-flash-native-audio-preview-12-2025`

## Key Patterns

### React Prop Dependencies
When adding or removing features, follow this order to avoid black screen:

**Adding (top-down):** State → Props → Logic → UI
**Removing (bottom-up):** UI → Logic → Props → State → Imports

### Socket.IO Events (Key)
- `start_audio` / `stop_audio` - Activate/deactivate Lexi
- `status` - Session state updates
- `transcription` - Voice transcripts
- `web_frame` - Browser screenshots
- `tool_confirmation` - Permission prompts

### Project Context
- Default project: `projects/temp/` (cleared on startup)
- User projects: `projects/<name>/` with `cad/`, `browser/`, `chat_history.jsonl`

## Code Style

### Python
- PEP 8, snake_case functions/variables, PascalCase classes
- Type hints required for function signatures
- All I/O operations must be async
- Logging: `print(f"[ModuleName] ...")`

### TypeScript/React
- Strict TypeScript mode
- Functional components with React 19 Hooks
- PascalCase for components, camelCase for functions/files
- useEffect with cleanup for Socket.IO listeners
