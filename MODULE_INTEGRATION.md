# Module Integration Contract (Lexi Repo)
*Version: 2.1 (Updated 2026-02-05 with Remote Module pattern)*

Detta dokument beskriver den **faktiska arkitekturen** som används av Lexis befintliga kärnmoduler (`KasaAgent`, `PrinterAgent`).
Nya moduler ska följa detta mönster för att säkerställa 100% kompatibilitet och funktion direkt.

---

## 1. Modul-Arkitektur
Lexi använder en monolitisk **Agent-baserad arkitektur**. Varje förmåga (Capability) är en Python-klass.

### 1.1 Struktur
*   **Fil:** `backend/<name>_agent.py`
*   **Klass:** En klass som håller tillstånd (state) och metoder.
*   **Async:** Alla tunga operationer måste vara `async`.

### 1.2 Returvärden (Inga Envelopes)
Befintliga moduler returnerar **direkta värden**, inte JSON-envelopes.
*   **Framgång:** Returnera `True`, en `dict`, en `list`, eller en sträng.
*   **Misslyckande:** Returnera `False`, `None`, eller en tom lista `[]`. Kasta *inte* exceptions till main-loopen om det kan undvikas.

### 1.3 State Management
Moduler instansieras **en gång** vid uppstart av `Lexi` (i `backend/lexi.py`). De lever så länge servern körs.
*   Använd `__init__` för att initiera variabler (t.ex. `self.devices = {}`).
*   Använd en `async def initialize(self)` metod om du behöver I/O start (t.ex. nätverkssökning).

---

## 2. Integration (Manuell Dispatch)
Just nu finns ingen dynamisk laddning. Integration kräver modifikation av kärnfilen.

### 2.1 Registrering (`backend/lexi.py`)
1.  **Importera:** Lägg till importstement i toppen (`from my_new_agent import MyNewAgent`).
2.  **Initiera:** Skapa instansen i `Lexi.__init__`:
    ```python
    self.my_agent = MyNewAgent()
    # Om init behövs:
    await self.my_agent.initialize() # i run() eller initialize()
    ```
    
### 2.2 Schema Definition
Verktygets interface mot Google Gemini definieras som en `dict` (JSON-schema).
*   Se `backend/lexi.py` (toppen av filen) eller `backend/tools.py`.
*   Lägg till definitionen i listan `tools`.

### 2.3 Dispatch Logic (`Lexi.receive_audio`)
Du måste manuellt lägga till en `elif`-sats i huvudloopen:
```python
elif fc.name == "my_tool_function":
    # 1. Extrahera argument
    arg1 = fc.args["arg1"]
    
    # 2. Anropa agenten
    result = await self.my_agent.do_something(arg1)
    
    # 3. Formatera sträng-svar till modellen
    if result:
        response_str = f"Success: {result}"
    else:
        response_str = "Failed to perform action."
        
    # 4. Lägg till i responses
    function_responses.append(types.FunctionResponse(
        id=fc.id, name=fc.name, response={"result": response_str}
    ))
```

---

## 3. Best Practices (Från Kasa/Printer Agents)

*   **Beroenden:** Läggs i `requirements.txt`.
*   **Logging:** Använd `print(f"[MyAgent] ...")` för debugging.
*   **Fail-Safe:** Omslut nätverksanrop med `try...except` inuti agenten så att inte hela Lexi kraschar.
*   **File I/O:** Om agenten läser/skriver filer, ta `root_path` som ett argument i metoden (skickas från `Lexi.project_manager` i dispatch-steget) och validera att filen hamnar rätt.

---

## 4. "Hello Module" (Referensimplementation)
Följ denna mall som matchar `KasaAgent`.

**Fil:** `backend/hello_agent.py`
```python
import asyncio

class HelloAgent:
    def __init__(self):
        self.count = 0

    async def greet(self, name):
        """Standard method returning simple data."""
        try:
            self.count += 1
            if not name:
                return None
            
            # Simple logic
            print(f"[HelloAgent] Greeting {name} (Count: {self.count})")
            return f"Hello {name}! I have greeted {self.count} people."
            
        except Exception as e:
            print(f"[HelloAgent] Error: {e}")
            return None
```

**Integration i `lexi.py`:**
```python
# 1. Schema
hello_tool = { "name": "say_hello", "parameters": { ... } }

# 2. Dispatch
elif fc.name == "say_hello":
    res = await self.hello_agent.greet(fc.args["name"])
    if res:
        response_text = res
    else:
        response_text = "I couldn't verify the name."
```

---

## 5. "Remote Module" (External API Integration)
*Exempel: `OpenClawAgent`. Används för kommunikation med externa AI-system.*

### 5.1 External API Pattern
```python
class OpenClawAgent:
    def __init__(self, base_url: str = "", token: str = ""):
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.token = token
        self._session: Optional[aiohttp.ClientSession] = None

    async def send_task(self, prompt: str, timeout: int = 120) -> dict:
        """Send task to remote agent via OpenAI-compatible API."""
        if not self.base_url or not self.token:
            return {"success": False, "error": "Not configured"}

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }

        async with session.post(f"{self.base_url}/v1/chat/completions",
                                json=payload, headers=headers) as resp:
            # Handle response...
```

### 5.2 NON_BLOCKING Tool Pattern
For long-running external operations, use the NON_BLOCKING pattern:
1. **Tool triggers background task** (no immediate response to model)
2. **Agent performs operation** (may take 30-120 seconds)
3. **Callback notifies completion** (sends result to Gemini session)

---

## 6. "Advanced Module" (High Risk + Side Effects)
*Exempel: `WebAgent`. Används för långkörande processer eller autonoma agents.*

### 5.1 Callbacks (Side Effects)
För att skicka realtidsdata (screenshots, loggar) till frontend utan att blockera main-loopen:
1.  **Definiera Callback:** Agentens metod tar en `update_callback` funktion.
2.  **Server Wiring (`server.py`):**
    ```python
    async def on_web_update(data):
        await sio.emit('web_frame', data)
        
    # I initialize_lexi:
    audio_loop = lexi.AudioLoop(..., on_web_data=on_web_update)
    ```
3.  **Agent Implementation:**
    ```python
    async def run_task(self, prompt, update_callback=None):
        # 1. Long running loop
        while running:
             # 2. Emit side effect
             if update_callback:
                 await update_callback({"type": "log", "msg": "Clicking button..."})
             
             # 3. Perform High Risk Action (Network/Auth)
             await self.browser.click(...)
    ```

### 5.2 High Risk Policy (Legacy)
`WebAgent` är en "High Risk" modul men saknar idag explicit spärr i sin klass.
**Ny Standard:** Om du bygger en liknande agent, lägg till kontroll:
```python
# Pseudo-kod för framtida spärr
if not config.ENABLE_HIGH_RISK:
    return "Error: High Risk tools are disabled."
```
