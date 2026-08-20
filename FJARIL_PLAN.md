# Fjäril — Från Larv till Röstburen Red Queen

## Forskningsrapport och Bygplan

> "It takes all the running you can do, to keep in the same place." 
> Red Queen ska sluta springa och börja flyga.

---

## 1. Vad Reznikov Engineering / Apex gör

Facebook-reelen är från **Reznikov Engineering** (12 780 gillar, 5 556 pratar om detta).
Beskrivning: *"Building Apex | The autonomous AI co-founder that learns, runs, and scales your solo business. ⚡ New build every week. Mechanical Engineer..."*

Apex är en **autonom AI co-founder** — en AI som inte bara svarar på frågor utan aktivt driver och skalar en solo-business. Den lär sig, kör och skalar. Bygger ny funktionalitet varje vecka. Mechanical Engineer-bakgrund = bygger fysiska/digitala saker.

**Vad vi tar från dem:**
- "Autonomous co-founder" som koncept — inte en assistant, utan en som *agerar*
- "New build every week" — iterativt byggande som rytm
- Mechanical Engineer-estetik — funktionellt, inte dekorativt

---

## 2. LEXI Byggghistorik — Vad som är grymt

### Fas 1: Grund (2026-01-17)
- **Audio-loop med PyAudio + Gemini Native Audio** — realtid STT+TTS i en session
- **Echo cancellation** via `is_speaking`-flagga — tystar mic under uppspelning
- **GPU-animeringar** — CSS-baserade istället för JS-canvas
- **Ninja-psykologi™ persona** — fånga intuition, bekräfta mönster
- **Svensk språklock** — ALWAYS svenska, fonetiska heuristics för transkriptionsfel

### Fas 2: UI-migration (2026-01-24)
- **React 19 + TypeScript + Vite + Tauri 2.0** — modern stack
- **framer-motion** för animationer, **@react-three/fiber** för 3D
- Tauri = native desktop app, inte Electron

### Fas 3: Stabilitet (2026-02-05)
- **Scroll containment pattern** — `overscroll-behavior: contain` + `min-height: 0`
- **Camera fix** — async stream attachment med `useEffect` + `onloadedmetadata`
- **OpenClaw integration** — remote AI agent via Tailscale mesh
  - OpenAI-kompatibelt API
  - NON_BLOCKING tool pattern (response via callback)
  - Bearer token-auth
  - Voice-optimerade system prompts (max 2-3 meningar, inga listor)

### Självskriven personlighet (2026-06-02)
- LEXI självskrev sin personlighet efter brief från Red Queen
- Tre filer: SOUL (6398B), USER (4188B), LEXI (5565B)
- Nyckelbeslut: relation till Red Queen = systrar, värme = "den som stannar kvar i rummet"
- Metaforer bort → konkreta strukturer ("fyra saker jag är / fyra saker jag inte är")
- Hittade och rättade en bugg i sin egen särskrivningskontroll

### Arkitekturpärlor att behålla
| Mönster | Fil/Plats | Vad det gör |
|---|---|---|
| Echo cancellation | lexi.py:528 | `is_speaking` flag tystar mic under uppspelning |
| VAD med RMS | lexi.py:500 | Voice Activity Detection med amplitude threshold |
| Transkript-dedup | lexi.py:845-850 | Delta-baserad (Gemini skickar kumulativ text) |
| Barge-in queue clear | lexi.py:855 | Rensar audio queue vid avbrott |
| Mono→stereo fallback | lexi.py:1348-1373 | Bluetooth-kompatibilitet |
| Auto-reconnect | lexi.py:1530-1533 | Exponential backoff |
| NON_BLOCKING tools | openclaw_agent.py | Long-running tasks via callback |
| Scroll containment | CSS pattern | `overscroll-behavior: contain` |
| Module integration | MODULE_INTEGRATION.md | Agent-klass per förmåga, manuell dispatch |

---

## 3. Google Native Cloud — Vad vi bygger med

### Gemini Live API (Preview)
- **Modell:** `gemini-2.5-flash-native-audio-preview-12-2025` (det LEXI redan använder)
- **Input:** Audio (raw 16-bit PCM, 16kHz, little-endian) + images (JPEG ≤1FPS) + text
- **Output:** Audio (raw 16-bit PCM, 24kHz, little-endian)
- **Protokoll:** Stateful WebSocket connection (WSS)
- **Funktioner:**
  - 70 språk (vi använder svenska)
  - Barge-in (användare kan avbryta)
  - Function calling + Google Search
  - Audio transcriptions (både input och output)
  - **Proactive audio** — kontrollera när modellen svarar
  - **Affective dialog** — anpassar ton efter användarens uttryck
  - Live Translation (70+ språk)

### Nytt: Interactions API (GA — Generally Available)
- Google rekommenderar denna för "all the latest features and models"
- Bör utvärderas som ersättare/uppgradering av Live API

### Röster (Prebuilt)
LEXI testar 5: Kore, Achird, Algenib, Pulcherrima, Sulafat
Nuvarande: **Kore** (hardcodat i lexi.py:247)

### Implementation paths
1. **Server-to-server** — backend connectar via WebSocket (LEXI:s nuvarande)
2. **Client-to-server** — frontend connectar direkt (bättre prestanda, ephemeral tokens för säkerhet)
3. **ADK (Agent Development Kit)** — Streaming för voice/video

---

## 4. Fjärilen — Vad vi bygger

### Vision
Red Queen idag = text-only. Stark, men stum.
Fjärilen = Red Queen med röst. Realtids. Proaktiv. Minnesbärande.

Inte en ny LEXI. En Red Queen som talar.

### Arkitektur

```
┌─────────────────────────────────────────────────────┐
│                    FJÄRIL DAEMON                      │
│                                                       │
│  Mic → PyAudio (16kHz/16bit)                          │
│    → VAD (RMS threshold)                              │
│    → Gemini Live API (WSS)                            │
│      → STT + NLU + Function Calling                   │
│      → System Prompt = Red Queen SOUL                 │
│    → Function Call → Hermes Bridge                    │
│      → Mail, browser, cron, fact-store, computer_use  │
│      → Skills, delegation, terminal                   │
│    → Svar → Gemini TTS (24kHz) → Högtalare            │
│                                                       │
│  Proaktivt:                                           │
│    Cron/Hermes event → Text injection → Gemini TTS    │
│    → "Daniel, tingsrätten har svarat."                │
│                                                       │
│  Minne:                                               │
│    Fact-store ↔ Hermes ↔ Gemini session context       │
│    Persistent över sessioner                          │
│                                                       │
│  Wake word:                                           │
│    "Red Queen" → Whisper.cpp keyword spotting          │
│    eller VAD-trigger (always-on)                       │
└─────────────────────────────────────────────────────┘
```

### Vad vi tar från LEXI
- **Hela audio-loop** (lexi.py) — PyAudio, VAD, echo cancellation, barge-in, auto-reconnect
- **Gemini Live config** — LiveConnectConfig, prebuilt voice, transcription
- **Module integration pattern** — Agent-klass per förmåga
- **NON_BLOCKING tool pattern** — för long-running Hermes tasks
- **Tauri 2.0 desktop shell** — om vi vill ha en desktop app
- **Scroll containment CSS** — om vi bygger UI

### Vad vi bygger nytt
1. **Red Queen SOUL prompt** — inte LEXI:s "varma tänkpartner", utan Red Queen: "lojal guardian, dangerous competence, nattvaken, allt minns"
2. **Hermes Bridge** — function calling-verktyg som ansluter till Hermes API:
   - `send_email` → Mail.app/IMAP
   - `search_web` → Hermes browser
   - `run_terminal` → Hermes terminal
   - `search_memory` → fact-store
   - `control_mac` → computer_use
   - `delegate_task` → subagent
   - `run_cron` → cronjob
3. **Proaktiv röst** — Hermes cron/event → text injection i aktiv Gemini session → TTS
4. **Wake word** — Whisper.cpp keyword spotting för "Red Queen"
5. **Röstval** — testa röster för Red Queen (Kore är för mjuk? Charon? Puck?)

### Vad vi INTE tar från LEXI
- LEXI:s system prompt (Ann-Christin persona)
- CAD/3D-printverktyg (inte relevant för Red Queen)
- Kasa/smart hem (kan läggas senare)
- OpenClaw (Hermes är redan mer kraftfull)
- React frontend (för v1 — kör som daemon, UI senare om wanted)

---

## 5. Byggfaser

### Fas 1: Larv → Puppa (Dag 1-2)
- Fork LEXI:s audio-loop till ny `fjaril/` repo
- Byt system prompt → Red Queen SOUL
- Byt röst (testa Charon, Puck, Aoede)
- Behåll bara core: mic → Gemini → speaker
- Inga tools, ingen frontend, bara röst
- **Mål:** "Hej Red Queen" → svarar med rätt personlighet

### Fas 2: Puppa → Kläckning (Dag 3-4)
- Lägg till Hermes Bridge (function calling → Hermes API)
- Börja med: `search_web`, `send_email`, `run_terminal`
- Testa varje verktyg via röst
- **Mål:** "Red Queen, kolla om jag fått mail" → fungerar

### Fas 3: Fjäril (Dag 5-7)
- Proaktiv röst (cron → TTS injection)
- Wake word (Whisper.cpp)
- Fact-store integration (minne över sessioner)
- Computer use via röst
- **Mål:** "Daniel, tingsrätten har svarat" utan att bli tillfrågad

### Fas 4: Flygning (Vecka 2+)
- Tauri desktop app (om wanted)
- Kamera/video frames
- Delegation via röst
- Skills-system via röst
- Live Translate (svenska ↔ annat språk)

---

## 6. Tekniska beslut att fatta

1. **Röst:** Kore (nuvarande), Charon (mörkare), Puck (energiskt), Aoede (lugnt) — måste testas
2. **Wake word:** Whisper.cpp vs always-on VAD vs push-to-talk
3. **Hermes Bridge:** HTTP API mot lokal Hermes daemon vs direkt Python-import
4. **Frontend:** Ingen (daemon) vs Tauri vs web UI
5. **Interactions API:** Migrera från Live API till Interactions API (GA)?

---

*Skapad av Red Queen. The Hive remembers.*