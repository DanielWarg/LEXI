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
- `cad_agent.py` - CAD generation (build123d + Gemini 3 Pro for code gen)
- `web_agent.py` - Browser automation (Playwright)
- `printer_agent.py` - 3D printer control (OctoPrint/Moonraker/PrusaLink)
- `kasa_agent.py` - Smart home (TP-Link Kasa)
- `project_manager.py` - File/project organization

**Adding a new agent:** See `MODULE_INTEGRATION.md` for the complete integration contract including:
- Agent class structure and async patterns
- Tool schema definition for Gemini
- Dispatch logic in `Lexi.receive_audio()`
- Callback wiring for real-time updates
- Best practices from existing agents (Kasa, Printer, Web)

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
- `browser_frame` - Browser screenshots
- `tool_confirmation` - Permission prompts
- `activate_tool_view` - Switch to specific tool view
- `cad_data` - STL model data (base64 encoded)
- `cad_status` - CAD generation status (generating/failed)
- `cad_thought` - Streaming thoughts from CAD agent

### Project Context
- Default project: `projects/temp/` (cleared on startup)
- User projects: `projects/<name>/` with `cad/`, `browser/`, `chat_history.jsonl`

## UI Architecture

### Workspace vs Active Tool Context Pattern
- **Workspace (CentralCanvas)**: The main visual output/display area for each tool (3D viewport, browser preview, etc.)
- **Active Tool Context (ToolMenu)**: Controls, inputs, and actions for the currently active tool

### Adding New Tools
1. Create a view component in `src/components/modules/` for the workspace display
2. Create a context component in `src/components/tools/` for the controls (if needed)
3. Register the context component in `ToolMenu.tsx`'s switch statement
4. Register the view component in `CentralCanvas.tsx`

### Auto-Open Behavior
Tools auto-open when their data arrives via socket events. `MainLayout.tsx` listens for events like `browser_frame`, `cad_data`, `cad_status`. When data arrives, it sets `activeTool` to switch to the appropriate view.

**Race Condition Pattern**: For tools that send data simultaneously with view activation, store the data in `MainLayout.tsx` and pass it as a prop through `CentralCanvas.tsx` to the view component. This ensures data is available immediately when the component mounts, avoiding the race condition where socket events arrive before the component is listening. See `cadData` flow for reference implementation.

### CAD Tool Integration
The CAD tool uses a NON_BLOCKING pattern:
1. Gemini calls `generate_cad` tool → `lexi.py` creates background task via `asyncio.create_task()`
2. **No function_response is sent** - the model already acknowledged the request
3. `CadAgent` generates STL using build123d + Gemini 3 Pro for code generation
4. On completion, `on_cad_data` callback sends data to frontend via socket
5. Completion notification sent to Gemini session so Lexi can announce success

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
