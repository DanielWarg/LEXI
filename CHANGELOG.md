# Changelog

## [2026-02-05] - Scroll Fixes & Camera Improvements

### 🐛 Bug Fixes
- **Scroll Overflow:** Fixed issue where tool views (WebAgent, CAD, etc.) would scroll the entire workspace when content overflowed. Added `overflow: hidden` and `overscroll-behavior: contain` to all tool containers.
- **Camera View:** Fixed video feed not displaying. Refactored to properly handle async stream attachment with `useEffect` and `onloadedmetadata` events.
- **Face Authentication:** Disabled FaceAuthenticator initialization when `face_auth_enabled` is false, preventing unnecessary OpenCV camera access errors on startup.

### 🛠️ Improvements
- **Scroll Isolation:** All tool views now properly contain their scroll behavior:
  - SettingsView, FilesView, CameraView, KasaView, PrinterView
  - WebToolContext, CadToolContext, VoiceWidget
  - ToolMenu, MainLayout sidebar, CentralCanvas

### 📁 Files Changed
- `backend/server.py` - Conditional FaceAuthenticator initialization
- `src/components/modules/*View.css` - Overflow containment
- `src/components/tools/*Context.css` - Scroll isolation
- `src/components/modules/CameraView.tsx` - Video stream handling

---

## [Unreleased] - 2026-01-25

### 🚀 New Features
- **Swedish Language Lock:** Implemented a robust Swedish-only communication policy.
- **Phonetic Heuristics:** Added logic to correctly interpret common transcription errors (e.g., "Heller ikke") as "Hej Lexi".

### 🛠️ Improvements
- **Language Consistency:** Translated all 15+ tool descriptions and system notifications to Swedish to prevent "context contamination" and maintain a consistent persona.
- **Natural Interaction:** Refined system instructions to reduce the frequency of using the user's name and adopt a more natural "partner" tone.
- **Tests:** Updated and verified all backend tool tests.

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
