# Changelog

## [Unreleased] - 2026-01-25

### 🚀 New Features
- **File Uploads:** Added new `/upload` endpoint to Backend (`server.py`) allowing users to upload files directly to the active project context (saved in `uploads/` folder).
- **Vision Document:** Added `VISION.md` outlining the philosophy of Lexi as an "Entity" rather than a tool.
- **Documentation:** Major rewrite of `README.md` to reflect the new Entity-first vision and removed deprecated features (Gesture Control). `AGENTS.md` updated to link to Vision.

### 🛠️ Improvements
- **Dependencies:** Restored `python-multipart` to support file uploads.
- **Cleanup:** Removed unused dependencies (`mss`) and clarified `mediapipe` usage.

---

## [2026-01-24] - UI Migration & Rewrite

### 🚀 Major Feature: New UI Integration
*   **New Frontend Stack:**
    *   Switched from JavaScript (.jsx) to **TypeScript (.tsx)**.
    *   Upgraded to **React 19** and **Vite**.
    *   Integrated modern libraries: `framer-motion` (animations), `@react-three/fiber` (3D).
*   **Structure:**
    *   Replaced entire `src/` folder with `lexi-ui` codebase.
    *   Updated `package.json` to include new dependencies while maintaining Tauri support.

### 📂 Repository & Workspace Cleanup
*   **Restructuring:**
    *   Renamed `lexi-repo-clone` to **`Lexi`** (now the active main project).
    *   Moved old `lexi-ui` to `Archive/`.
    *   Cleaned up root directory.

### 📝 Documentation
*   **AGENTS.md:** Updated to reflect the new technical stack (TypeScript, React 19).
*   **CHANGELOG:** Created initial log.

---
*Maintained by Nazir Louis*
