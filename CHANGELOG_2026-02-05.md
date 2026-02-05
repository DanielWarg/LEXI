# Changelog 2026-02-05

## Sammanfattning
Idag har vi byggt en integration mellan Lexi och OpenClaw, som möjliggör kommunikation mellan de två AI-systemen via Tailscale. Lexi kan nu delegera uppgifter till OpenClaw som körs på en separat maskin (MacBook Air M1).

### 🚀 Major Feature: OpenClaw Integration

*   **Ny Agent: `OpenClawAgent`**
    *   Fil: `backend/openclaw_agent.py`
    *   Kommunicerar med OpenClaw via OpenAI-kompatibelt API (`/v1/chat/completions`)
    *   Använder aiohttp för asynkrona HTTP-anrop
    *   Bearer token-autentisering
    *   Konfigurerbar timeout (default 120s för långa tasks)

*   **Nätverksarkitektur:**
    *   Tailscale mesh-nätverk för säker kommunikation
    *   End-to-end kryptering (WireGuard)
    *   Tailscale Serve för HTTPS-proxy (ingen direkt portexponering)
    *   OpenClaw endast åtkomlig inom Tailscale-nätverket

*   **Tool Definition i Lexi:**
    ```python
    send_to_openclaw_tool = {
        "name": "send_to_openclaw",
        "description": "Skickar uppgift till OpenClaw...",
        "parameters": {
            "prompt": "Uppgiften som skall utföras",
            "system_prompt": "Valfritt systemmeddelande"
        },
        "behavior": "NON_BLOCKING"
    }
    ```

*   **Voice-optimerat System Prompt:**
    *   OpenClaw får instruktioner att svara koncist (max 2-3 meningar)
    *   Formaterat för att vara naturligt att läsa upp
    *   Undviker listor, markdown, kod i svar

### 🔧 Bug Fixes & Improvements

*   **Tool Calling Fix:**
    *   Fixade indenteringsfel i confirmation-logiken
    *   Förbättrade tool-beskrivningar för att Gemini ska trigga korrekt
    *   Lagt till varianter: "OC", "Open Claw", "openclo" i igenkänning

*   **Echo Cancellation:**
    *   Ökade cooldown från 0.2s till 0.6s för att förhindra feedback-loop

*   **Spontaneous Speech Fix:**
    *   Ändrade reconnect-meddelande till `end_of_turn=False`
    *   Lade till instruktion att vänta på user input

*   **Mute on Startup:**
    *   Default `muted=True` vid serverstart
    *   Förhindrar att Lexi lyssnar på omgivande ljud innan aktivering

*   **UI Update:**
    *   Ändrade idle-state text till "This is the way..."

### 🔐 Säkerhet

| Aspekt | Implementation |
|--------|----------------|
| Nätverkskryptering | Tailscale/WireGuard |
| Internet-exponering | Blockerad |
| API-autentisering | Bearer token |
| HTTPS | Via Tailscale Serve |
| Token-lagring | settings.json (lokalt) |

### 📂 Nya/Modifierade Filer

*   `backend/openclaw_agent.py` - **NY** - Agent-klass för OpenClaw-kommunikation
*   `backend/lexi.py` - Tool definition, dispatch logic, system prompt
*   `backend/server.py` - OpenClaw settings, default muted=True
*   `settings.json` - OpenClaw konfiguration (base_url, token, model)
*   `src/components/workspace/CentralCanvas.tsx` - UI text update

### 🎯 Planerat (Nästa Steg)

*   Tvåvägs filöverföring mellan Lexi och OpenClaw
*   Upload-endpoint på Lexi med token-validering
*   Wake word som alternativ till always-on mic

---
*Created by Claude Opus 4.5*
