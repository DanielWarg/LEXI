Projektöversikt                                                                                                             
                                                                                                                              
  Lexi är en röst-först AI-assistent byggd för makers och ingenjörer. Det är en hybrid local-first-system med:                
  - Realtids röst I/O via Gemini 2.5 Native Audio                                                                             
  - Webbläsarautomation (Playwright)                                                                                          
  - CAD-generering (build123d)                                                                                                
  - 3D-printer-kontroll (OctoPrint/Moonraker/PrusaLink)                                                                       
  - Smarta hem-integration (TP-Link Kasa)                                                                                     

  Gränssnittet är primärt på svenska.

  Teknisk Stack
  ┌───────────────┬──────────────────────────────────────────┐
  │     Lager     │                Teknologi                 │
  ├───────────────┼──────────────────────────────────────────┤
  │ Frontend      │ React 19 + TypeScript + Vite + Tauri 2.0 │
  ├───────────────┼──────────────────────────────────────────┤
  │ Backend       │ Python 3.11 + FastAPI + Socket.IO        │
  ├───────────────┼──────────────────────────────────────────┤
  │ AI            │ Google Gemini 2.5 (Native Audio)         │
  ├───────────────┼──────────────────────────────────────────┤
  │ Kommunikation │ Socket.IO (port 8000 ↔ frontend)         │
  └───────────────┴──────────────────────────────────────────┘
  Kärnprinciper

  1. Entity, inte chatbot – Lexi behåller kontinuitet mellan sessioner
  2. Projekt framför konversationer – Arbete ankras i strukturerade projekt
  3. Real-time preview – Allt händer synligt (webläsare, CAD, enheter)
  4. Voice-first, aldrig voice-only – Röst driver, workspace bekräftar

  Aktuell Status (2026-02-05)

  - ✅ WebAgent aktiv
  - ✅ Voice/Audio fungerar
  - ✅ Scroll-beteende fixat
  - ✅ Kamera fungerar
  - ⚪ Face Auth (valfritt, avaktiverat som standard)

  Agent-arkitektur

  Varje förmåga är en Python-klass i backend/:
  - cad_agent.py – CAD-generering
  - web_agent.py – Webbläsarautomation
  - printer_agent.py – 3D-printer
  - kasa_agent.py – Smart hem
  - project_manager.py – Fil/projekthantering

  Nya moduler integreras manuellt via lexi.py (dispatch) och tools.py (schema).