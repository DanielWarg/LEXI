# VOCE — arkitekturutredning för Red Queens röstlager

**Datum:** 2026-08-20  
**Omfattning:** Läsning av LEXI:s röstimplementation och rösttester, APEX M6B/M7 samt FJÄRIL:s voice/brain/tools.  
**Ändringar i källkod:** Inga. Denna fil är den enda nya filen.

## Slutsats

Red Queen bör **tweaka LEXI:s befintliga röstlager**. Det är det enda av de tre lagren som både har den kompletta interaktiva loopen och dokumenterad verifiering med riktig Gemini-nyckel där ljud faktiskt producerades korrekt. APEX är den bästa källan för kontrakt, bounded queue, fail-closed-semantik och parity-testning, men är inte ännu den bästa körbara röstprodukten för Red Queen. FJÄRIL är en bra modulär prototypgrund men saknar för mycket av den fungerande realtidsloopen.

Detta betyder inte att LEXI:s monolit ska växa obegränsat. Rätt väg är att behålla LEXI:s fungerande transport- och turn-taking-beteende, och lägga till ett tunt, testbart röstkontrakt med APEX-inspirerade säkerhetsregler. APEX ska användas som referens för hårdare gränssnitt och tester, inte som primär runtime i nästa steg.

## 1. De åtta röstmekanismerna

### Översikt

| Mekanism | LEXI | APEX | FJÄRIL | Bedömning av dubbletter |
|---|---|---|---|---|
| VAD | `AudioLoop.listen_audio`: RMS över tröskel 800, 0,5 s tystnad, triggar en bild vid talstart | `EnergyVAD`: float32 RMS, 20 ms frames, prefix padding och 700 ms tystnad, segmenterar en hel utterance | `audio_utils.detect_speech`: chunk-baserad RMS; ingen motsvarande utterance-segmentering i de lästa voice-filerna | Tre separata energibaserade VAD-varianter; bara APEX har en ren segmenteringskomponent |
| Echo-cancel | `AudioLoop.is_speaking`; `listen_audio` släpper inte mic-chunks under uppspelning och väntar 0,6 s efter kön tömts | `_speaking` blockerar mic-sändning under modelltal; dokumentet säger uttryckligen att fysisk AEC inte är verifierad | `should_mute_microphone` returnerar mute när AI talar | Samma software gate finns tre gånger; ingen av dem är fysisk akustisk echo cancellation |
| Transcription-dedup | `receive_audio` har separata `_last_input_transcription`/`_last_output_transcription`, ignorerar dubletter och räknar ut cumulative delta | Realtime-parsern publicerar input-transkript och modelldelta, men de lästa audio/voice-modulerna har ingen LEXI-lik cumulative-dedup-buffer | `TranscriptionBuffer` hanterar cumulative text, kortare ny text och reset | LEXI och FJÄRIL implementerar samma idé på olika ställen; APEX har eventflöde men inte hela dedupansvaret i voice-lagret |
| Barge-in | Ny input-transkription tömmer `audio_in_queue`; pågående ljud slutar därmed spelas upp | `AudioRuntime.barge_in()` stoppar högtalaren och avbryter lokalt Gemini-svar; de dokumenterade live-skripten har dessutom separat VAD-baserad barge-in-logik | Saknas i den lästa integrerade runtime-koden | LEXI och APEX har policy/semantik; APEX:s M6B-runtime blockerar samtidigt mic när `_speaking` är sant, så faktisk upptäckt under tal kräver ytterligare parallell barge-in-path |
| Queue | `audio_in_queue` skapas som vanlig obegränsad `asyncio.Queue`; `out_queue` har `maxsize=10`; clear tömmer playback-kön | `RealtimeSession` har bounded event queue; M7 `PlaybackQueue` har hård kapacitet, backpressure och terminal cancel | Ingen playback queue; audio skickas via callbacks | APEX är ensamt om komplett bounded/disposable playback-semantik. LEXI har queue clear men inte hård gräns |
| Reconnect | `AudioLoop.run` fångar TaskGroup-/receive-fel, backoffar 1→10 s och återansluter; historik skickas tillbaka efter reconnect | `RealtimeSession.reconnect` har max tre försök, backoff och explicit state; AgentBridge skyddar Hermes-run och delivery | `GeminiSession` connect/disconnect finns, men ingen bounded reconnect-policy | LEXI och APEX har reconnect; FJÄRIL har livscykel utan återhämtningspolicy. LEXI:s loop kan försöka för evigt |
| Mono→stereo | Försöker mono-output, faller tillbaka till stereo och använder `audioop.tostereo`; även default-device fallback | Kontraktet är PCM16 mono 24 kHz och `SoundDeviceOutput` spelar rådata; ingen mono→stereo-konvertering | `convert_mono_to_stereo` duplicerar varje 16-bit sample | Tre olika device assumptions. LEXI är det enda körflödet som aktivt hanterar en stereo-only-enhet |
| Session-livscykel | `server.py` äger global `audio_loop`/`loop_task`; `AudioLoop.run` startar TaskGroup med send, mic, receive och playback; stop/pause/resume och server-shutdown finns | `AudioRuntime.start/stop` öppnar/stänger devices och session, cancelerar tasks; `RealtimeSession` äger states, receive task och close | `GeminiSession` har connect/disconnect/receive_loop och callbacks, men ingen samlad mic→VAD→playback-runtime i de lästa filerna | Alla har delar av livscykeln; LEXI är full produktloop, APEX tydligast separerad, FJÄRIL ofullständig som röstprodukt |

### Vad som faktiskt är gemensamt

Gemensamt är inte att implementationerna är samma, utan att de försöker lösa samma akustiska problem med samma grundprinciper: PCM, energibaserad taldetektion, en speaking-gate mot rundgång, streaming-transkript och återkoppling från Gemini. Dubbletten är tydligast i RMS-VAD, speaking-gate, mono/stereo-hjälp och cumulative transcription.

LEXI:s implementation är dock kopplad till en fungerande native-audio Gemini-session och till UI/tool-systemet. APEX:s komponenter är renare kontrakt men flera är ännu separata från en komplett produktupplevelse. FJÄRIL har bra byggblock men inte den sammanhängande realtidskedjan.

## 2. Arkitekturell jämförelse

### LEXI: monolitisk men bevisad

`LEXI/backend/lexi.py` innehåller `AudioLoop` samt Gemini-konfiguration, mic-I/O, VAD, echo-gate, transcription-delta, barge-in, playback, tool calls, projektloggning och reconnect. `server.py` kopplar samma objekt till Socket.IO, settings, credentials, device-val, pause/resume och shutdown.

Fördelar:

- Alla delar som krävs för ett samtal finns i en faktisk körkedja.
- Dataflödet är lätt att följa vid ett livefel: mic → `out_queue` → Gemini → `audio_in_queue` → `play_audio`.
- Riktig Gemini-nyckel och riktiga audio devices har redan gett fungerande ljud enligt projektets verifieringshistorik.
- Svenska systeminstruktioner, Kore-röst, transkript och frontend-events finns redan i samma integration.

Nackdelar:

- `AudioLoop` har för många ansvarsområden och är svår att enhetstesta utan import av PyAudio, OpenCV, Gemini och alla agenter.
- Globala resurser (`pya`, `client`, serverns `audio_loop`) gör isolerade tester och parallella sessioner svårare.
- `audio_in_queue` är obegränsad; vid långsam output kan minnet växa.
- Barge-in raderar pending playback men har ingen generation/token-mekanism som hindrar sent inkommet ljud från föregående svar.
- Reconnect är praktiskt men i princip obegränsat och dess context restore är textlogik inuti röstloopen.
- `audioop` är deprecated och bör inte vara den långsiktiga stereo-konverteringen på Python 3.13.

### APEX: bäst kontrakt och testbarhet, men ofullständig produktväg

APEX delar upp `EnergyVAD`, I/O-ABCs, `AudioRuntime`, realtime-session, Hermes-bridge, `VoiceRenderer`, `PlaybackQueue` och parity. `RealtimeSession` har bounded event queue, state machine och bounded reconnect. M7 har dokumenterad 944-testsvit, 100 % branch coverage och grön CI.

Fördelar:

- Lättast att enhetstesta och felsöka per gräns.
- Fakes kan ersätta mic, speaker, transport, TTS och Hermes utan fysisk hårdvara.
- Canonical Hermes-text hålls korrekt separerad från flyktigt ljud.
- Bounded queue, typed failures, cancel och parity är rätt säkerhetsprinciper för Red Queens operationer.
- Reconnect/delivery är tydligare än i LEXI och hindrar dubbla Hermes-resultat.

Nackdelar:

- M6B:s live-evidens bevisar främst textturn → Gemini-ljud → riktig högtalare; dokumentet säger att full mic→VAD→Gemini live kräver mänsklig talare.
- M7:s 944/100 %-gate gäller semantik med fake TTS och headless tests. Fysisk headset/mic/speaker/acoustic-echo UX är uttryckligen inte verifierad.
- `VoiceRenderer` är en injicerad synthesize-funktion, inte en färdig verifierad koppling som gör Hermes canonical output till den faktiska Red Queen-röstupplevelsen.
- M6B och M7 har delvis olika ansvar: runtime spelar Gemini output, medan M7 beskriver canonical Hermes rendering. Den konkreta orkestreringen mellan dessa är fortfarande ett integrationsproblem.
- APEX:s rena kontrakt gör det lättare att bevisa komponenter, men inte automatiskt lättare att få rätt device, modell, endpoint, språk, timing och akustik live.

### FJÄRIL: bäst modulär startpunkt för ny kod, inte rätt startpunkt för leverans

FJÄRIL delar upp `audio_utils`, `TranscriptionBuffer`, `voice_config`, `GeminiSession`, `ToolRouter`, `HermesBridgeTool` och `soul`.

Fördelar:

- Små moduler, enkla dependencies och god lokal testbarhet.
- Voice-config är parametriserbar med tillåtna röster.
- Hermes-bron har action-whitelist, endpoint-validering och bounded error body.
- TranscriptionBuffer och PCM-helpers är lätta att återanvända.

Nackdelar:

- Ingen komplett integrerad mic/VAD/echo/barge-in/playback/reconnect-loop i de lästa voice/brain/tools-filerna.
- `GeminiSession.send_audio` skickar rådata utan den rikare format-/turn-semantik som APEX explicit kontrakterar.
- `receive_loop` rapporterar fel via callback men återansluter inte.
- Tool-routing returnerar fel som text; det är användbart för prototypen men svagare som execution-truth-kontrakt.
- Tester bevisar helpers och callbacks, inte fungerande fysisk röst eller full Hermes-röstkedja.

### Testbarhet, felsökning och underhåll

1. **APEX är lättast att testa och felsöka per komponent.** Det har bäst explicit state, kontrakt, fakes, bounded queues och evidence.
2. **FJÄRIL är näst lättast att förstå lokalt.** Modulerna är små, men den saknade integrerade runtime gör att systemfelet bara flyttar utanför testsviten.
3. **LEXI är svårast att testa isolerat och lättast att felsöka som faktiskt körande produkt.** Det är en viktig skillnad: den har sämst arkitektur för vidare tillväxt men bäst bevis för att den sammanhängande rösten fungerar.

## 3. Definitivt beslut

### Välj (a): tweaka LEXI:s röstlager

Skälet är evidens, inte estetik. APEX har bättre byggkvalitet i komponenterna men har ännu inte bevisat den interaktiva Red Queen-upplevelsen som Daniel efterfrågar. FJÄRIL är ännu tidigare. Att fortsätta M7/M8 som primär väg innebär därför att återupprepa integrations- och livefelsökningen i ett nytt system trots att LEXI redan har rätt modell, device-fallback, transkriptflöde, tool-koppling, reconnect och verifierad ljudproduktion.

LEXI ska inte kopieras till FJÄRIL och APEX ska inte bli ännu ett parallellt runtime-spår. Portera endast de regler som bevisligen förbättrar LEXI: bounded playback, canonical-text/parity, explicit audioformat och generation-säker cancellation.

## 4. Konkret väg för LEXI-tweaken

### Filer och klasser

1. **`LEXI/backend/lexi.py`, `AudioLoop.listen_audio`**
   - Behåll den fungerande mic-pathen och RMS-VAD:n.
   - Flytta VAD-konstanter till ett explicit kontrakt eller en liten hjälpklass så threshold, silence duration och frame policy kan testas utan att starta PyAudio.
   - Lägg in en bounded input/playback-policy. `out_queue(maxsize=10)` räcker inte för output; `audio_in_queue` måste få hard cap och definierad drop/clear-policy.

2. **`LEXI/backend/lexi.py`, `AudioLoop.receive_audio`**
   - Behåll cumulative transcription-delta-logiken men isolera den i en testbar `TranscriptionBuffer`-lik komponent.
   - Lägg en playback-generation på varje modellturn. Barge-in ska invalidiera generationen, tömma kön och ignorera sent inkommande chunks från gammal generation.
   - Koppla canonical Hermes-text före speech: den text som ska sägas ska komma från Hermes-resultatet, medan Gemini voice endast är renderingskanal.

3. **Ny `LEXI/backend/voice_contracts.py`**
   - Lägg här små, dependency-fria kontrakt: bounded playback queue, generation/cancel-state, PCM-formatvalidering och parity-jämförelse.
   - Återanvänd principerna från APEX `PlaybackQueue` och `compare_parity`, men håll modulen fri från PyAudio, Gemini och Socket.IO.
   - Parity ska kontrollera åtminstone mottagare, belopp, datum, tid och kommando; mismatch ska vara telemetry/failure, aldrig skriva om Hermes-texten.

4. **`LEXI/backend/lexi.py`, `AudioLoop.play_audio`**
   - Ersätt `audioop.tostereo` med en liten PCM16-konvertering i den nya dependency-fria modulen, eller använd en modern audio-API-gräns.
   - Behåll 24 kHz output-kontraktet och device-fallbacken. Validera sample width, kanalpolicy och chunk-alignment innan write.
   - Låt queue stop/cancel vara idempotent och förhindra återupptagning av gamla chunks.

5. **`LEXI/backend/lexi.py`, `AudioLoop.run`**
   - Behåll reconnect eftersom den är en del av det fungerande systemet.
   - Gör retry policy explicit: bounded session-attempts eller tydligt operatorläge efter upprepade fel, med state-event till servern.
   - Återställ kontext utan att återspela gammalt ljud och resetta transcription/playback-generation vid ny session.

6. **`LEXI/backend/server.py`, `initialize_lexi` och audio-events**
   - Behåll Socket.IO callbacks och settings, men skicka canonical text, speech status, parity status och audio error som separata events.
   - Credentials ska fortsätta komma från miljö/settings-flödet; logga aldrig nyckel eller rå privat transkription i telemetry.
   - Hantera `stop_audio`/shutdown så task, queue, stream och session stängs i samma ordning utan `os._exit(0)` som normal cleanup-mekanism.

### Prioriteringsordning

Första ändringspaketet bör vara bounded queue + generation-säker barge-in + testbar transcription-dedup. Därefter PCM/stereo utan `audioop`, sedan canonical Hermes-text/parity. Först när dessa är på plats bör fysisk headset-/högtalartest göras igen.

## 5. Risker och trade-offs

### Testbarhet

LEXI:s nuvarande tester kontrollerar främst att `AudioLoop` och metoder/config finns. Det finns inte en motsvarande isolerad testsvit för VAD, cumulative transcription, queue overflow, barge-in race, reconnect eller stereo-konvertering. Tweaken måste därför börja med rena helper-/contract-tester och fake session/device. Annars kommer den verifierade live-egenskapen att förbli svår att regressionsskydda.

APEX:s 944 tester och 100 % branch coverage är stark evidens för kodens beslutsträd, men är inte evidens för akustisk kvalitet eller fungerande mänsklig barge-in. Coverage ska inte förväxlas med live-verifiering.

### Credentials och live-bevis

LEXI har verifierats med riktig Gemini-nyckel enligt projektets historik. APEX-skripten kräver också `GEMINI_API_KEY`, men M7:s egna moduler hanterar inga credentials och M7:s dokumentation avgränsar fysisk audio UX. FJÄRIL:s enhetstester använder mocks. Alla tre behöver separata, redigerade live-loggar utan rå transkript eller secrets.

### Monolitberoenden

LEXI:s största risk är att en röstfix påverkar CAD, web agent, printer, Kasa, OpenClaw, projektlogg och Socket.IO samtidigt. Därför ska nya röstregler läggas i dependency-fria kontrakt och injiceras i `AudioLoop`, inte implementeras som fler korsande flags i `server.py`.

### `audioop` och Python 3.13

`audioop` är deprecated och bör tas bort ur framtida LEXI-path. Den befintliga fallbacken är praktiskt värdefull men tekniskt skuldsatt. PCM16 mono→stereo är liten nog att implementera deterministiskt utan den modulen; den implementationen måste få egna tester för byteordning, sample duplication och ogiltig chunklängd.

### Deploybarhet

LEXI:s PyAudio/OpenCV/MSS/native-device-beroenden gör deployen maskin- och OS-känslig, men det är också exakt den väg som redan är körd. APEX:s sounddevice-ABCs förbättrar packaging och fake-testning, men skapar inte automatiskt rätt device-konfiguration. FJÄRIL är enklare att deploya som backendkomponent men saknar den lokala audio-runtime som krävs för Red Queen.

### Huvudtrade-offen

Valet står mellan LEXI:s bevisade integration och APEX:s bevisade isolerade kontrakt. För Red Queen är ett fungerande samtal den primära osäkerheten och därför vinner LEXI. Den tekniska skulden ska betalas med små, testbara kontrakt runt den fungerande loopen — inte genom att byta till ett renare men ännu inte live-bevisat huvudsystem.

## Källor som granskats

- `LEXI/backend/lexi.py`
- `LEXI/backend/server.py`
- `LEXI/tests/test_lexi_tools.py` och relevanta tester under `LEXI/backend/tests/`
- `APEX/src/apex/audio/*.py`
- `APEX/src/apex/voice/*.py`
- `APEX/docs/evidence/2026-08-08/m6b-audio-report.md`
- `APEX/docs/voice/m7.md`
- `APEX/docs/evidence/2026-08-20/m7-output-renderer.md`
- `APEX/src/apex/realtime/session.py` och `bridge.py` för reconnect/delivery-gränsen
- `fjaril/backend/voice/*.py`
- `fjaril/backend/brain/*.py`
- `fjaril/backend/tools/*.py`
- röstrelaterade tester under `fjaril/backend/tests/`

