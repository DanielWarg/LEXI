# AGENTS.md

## 1. Build, Lint, and Test Commands

### Backend (`backend/`)
- **Environment:** Python 3.x (Active in `.venv`)
- **Install Info:** `requirements.txt`
- **Run Server:** `.venv/bin/uvicorn backend.server:app_socketio --host 0.0.0.0 --port 8000 --reload`
- **Test:**
  - Run all: `.venv/bin/pytest backend/tests/`
  - Run single file: `.venv/bin/pytest backend/tests/test_filename.py`
  - Run single test: `.venv/bin/pytest backend/tests/test_filename.py::test_function_name`

### Frontend (`src/`)
- **Stack:** React 19 + TypeScript + Vite + **Tauri 2.0**
- **Install:** `npm install`
- **Dev Server (Tauri):** `npm run tauri dev`
- **Dev Server (Browser-only):** `npm run dev`
- **Lint:** `npm run lint`
- **Build:** `npm run build`

---

## 2. Code Style & Guidelines

### Python (Backend)
- **Formatting:** Adhere to PEP 8. Use `snake_case` for functions/variables, `PascalCase` for classes.
- **Imports:** Group standard libs, third-party, then local modules.
  - Example: `from backend.agent import MyAgent` (absolute imports preferred).
- **Type Hinting:** Use `typing` (List, Dict, Optional) for all function signatures.
- **AsyncIO:** The server is heavily async. Use `async def` and `await` for I/O operations.
- **Error Handling:**
  - Use `try/except` blocks in agent loops.
  - Log errors with context: `print(f"[Module DEBUG] Error: {e}")`.
  - Do not swallow exceptions silently unless intended.

### TypeScript/React (Frontend)
- **Language:** TypeScript (`.tsx`, `.ts`). Strict mode enabled.
- **Formatting:** Prettier/ESLint defaults (2 space indentation).
- **Components:** Functional components with React 19 features (Hooks).
- **Styling:** CSS Modules or global CSS variables for theming.
- **State Management:**
  - **Local:** `useState`, `useReducer`
  - **Global:** React Context or lifted state for app-wide data (Socket.IO).
- **Socket.IO:**
  - Use `socketService` singleton or context for clean architecture.
  - Listeners: `useEffect` with cleanup function.
- **Naming:** `PascalCase` for Components, `camelCase` for functions/variables/files.

### Project Structure
- `backend/` - All Python logic, agents and server.
- `src/`
  - `components/` - React UI components grouped by feature (e.g. `layout`, `modules`, `tools`).
  - `lib/` - Utilities, types, and services (e.g. simulation, socket).
  - `assets/` - Static images and logic.
- `src-tauri/` - Tauri native shell (Rust).

### Special Rules (Agentic Context)
- **Surgical Changes:** When debugging, create a reproduction script or minimal test case first.
- **File Operations:** Always use absolute paths or resolve relative paths safely.
- **Safety:** Do not delete user data without confirmation.

---

## 3. Project Status & Documentation

### Current State (2026-01-24)
- **Project Name:** Lexi
- **Frontend:** **NEW** TypeScript/React 19 UI (Integrated from `lexi-ui`)
- **Backend:** Python FastApi/Socket.IO
- **WebAgent:** ✅ Active and functional
- **Voice/Audio:** ✅ Restored and verified
- **Performance:** ✅ Optimized (Hardware accelerated animations)

### Key Architectural Insight: React Prop Dependencies
When adding or removing features, follow this order to avoid black screen:

**Removal (bottom-up):**
1. UI elements (buttons, settings)
2. Logic (functions, loops)
3. Props (from parent → child)
4. State variables
5. Imports

**Addition (top-down):**
1. State variables first
2. Props to child components
3. Logic implementation
4. UI elements last

### Git Tags
- `v1.0-webagent-working`: Stable base with WebAgent
- `stable-voice-restore-point`: (Tag) Verified working state before CAD cleanup
- `ui-revamp-merged`: (Recommended Tag) Post integration of new TypeScript UI

---

## 4. Next Steps

### 🎯 Active: UI Polish & Feature Re-integration
1. ✅ **Migrate UI:** Moved `lexi-ui` codebase into main `Lexi` repo.
2. 🔄 **Verify Integrations:** Ensure backend socket events map correctly to new frontend components.
3. 🔄 **Clean up:** Remove unused assets from old Electron implementation if any remain.
