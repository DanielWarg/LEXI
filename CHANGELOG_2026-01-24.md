# Changelog 2026-01-24

## Sammanfattning
Idag har vi genomfört en stor UI-migrering där vi ersatte den gamla Electron/React-frontendkoden med ett helt nytt, modernt TypeScript-baserat UI utvecklat separat i `lexi-ui`. Projektet har också städats upp och omorganiserats.

### 🚀 Major Feature: New UI Integration
*   **Ny Frontend Stack:**
    *   Bytt från JavaScript (.jsx) till **TypeScript (.tsx)**.
    *   Uppgraderat till **React 19** och **Vite**.
    *   Integrerat moderna bibliotek: `framer-motion` (animationer), `@react-three/fiber` (3D).
*   **Struktur:**
    *   Ersatt hela `src/`-mappen i huvudrepot med koden från `lexi-ui`.
    *   Uppdaterat `package.json` för att inkludera alla nya beroenden men behålla Tauri-stöd.
    *   Uppdaterat bygg- och utvecklingsskript.

### 📂 Repository & Workspace Cleanup
*   **Omstrukturering:**
    *   Döpt om `lexi-repo-clone` till **`Lexi`** (detta är nu det aktiva huvudprojektet).
    *   Flyttat gamla `lexi-ui` till mappen `Archive/`.
    *   Rensat upp i roten av `UIinspiration` för tydligare överblick.

### 📝 Dokumentation
*   **AGENTS.md:** Uppdaterad för att spegla den nya tekniska stacken (TypeScript, React 19) och mappstrukturen.
*   **CHANGELOG:** Skapat denna logg för att dokumentera migreringen.

---
*Created by Antigravity*
