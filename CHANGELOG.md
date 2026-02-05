# Changelog

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
