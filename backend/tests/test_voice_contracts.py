import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))


class FakeSession:
    def __init__(self):
        self.calls = []
        self.receive_calls = 0

    async def send(self, **kwargs):
        self.calls.append(kwargs)

    def receive(self):
        self.receive_calls += 1
        if self.receive_calls > 1:
            raise RuntimeError("stop test receive loop")

        async def responses():
            yield type("Response", (), {"data": b"pcm", "server_content": None, "tool_call": None})()

        return responses()


@pytest.mark.asyncio
async def test_send_realtime_sends_audio_dict_without_end_of_turn():
    from lexi import AudioLoop

    loop = AudioLoop.__new__(AudioLoop)
    loop.out_queue = asyncio.Queue()
    loop.session = FakeSession()
    await loop.out_queue.put({"data": b"mic", "mime_type": "audio/pcm"})

    task = asyncio.create_task(loop.send_realtime())
    await asyncio.sleep(0)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert loop.session.calls == [{
        "input": {"data": b"mic", "mime_type": "audio/pcm"},
        "end_of_turn": False,
    }]


@pytest.mark.asyncio
async def test_receive_audio_puts_pcm_with_put_nowait():
    from lexi import AudioLoop

    loop = AudioLoop.__new__(AudioLoop)
    loop.session = FakeSession()
    class RecordingQueue:
        def __init__(self):
            self.items = []

        def put_nowait(self, item):
            self.items.append(item)

        def empty(self):
            return True

    loop.audio_in_queue = RecordingQueue()
    loop._last_input_transcription = ""
    loop._last_output_transcription = ""
    loop.chat_buffer = {"sender": None, "text": ""}
    loop.on_transcription = None

    with pytest.raises(RuntimeError, match="stop test"):
        await loop.receive_audio()

    assert loop.audio_in_queue.items == [b"pcm"]


@pytest.mark.asyncio
async def test_play_audio_writes_pcm_to_stream(monkeypatch):
    from lexi import AudioLoop

    class FakeStream:
        def __init__(self):
            self.writes = []

        def write(self, data):
            self.writes.append(data)

    stream = FakeStream()
    monkeypatch.setattr("lexi.pya.open", lambda **kwargs: stream)

    loop = AudioLoop.__new__(AudioLoop)
    loop.audio_in_queue = asyncio.Queue()
    loop.output_device_index = None
    loop.on_audio_data = None
    await loop.audio_in_queue.put(b"response")

    task = asyncio.create_task(loop.play_audio())
    await asyncio.sleep(0)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert stream.writes == [b"response"]


def test_clear_audio_queue_drains_unbounded_asyncio_queue():
    from lexi import AudioLoop

    loop = AudioLoop.__new__(AudioLoop)
    loop.audio_in_queue = asyncio.Queue()
    loop.audio_in_queue.put_nowait(b"one")
    loop.audio_in_queue.put_nowait(b"two")

    loop.clear_audio_queue()

    assert loop.audio_in_queue.empty()


def test_mono_to_stereo_pcm16_fallback_conversion():
    from backend.voice_contracts import mono_to_stereo_pcm16

    assert mono_to_stereo_pcm16(b"\x01\x02\x03\x04") == b"\x01\x02\x01\x02\x03\x04\x03\x04"


def test_mono_to_stereo_pcm16_rejects_odd_byte_count():
    from backend.voice_contracts import mono_to_stereo_pcm16

    with pytest.raises(ValueError):
        mono_to_stereo_pcm16(b"\x01\x02\x03")


def test_parity_matches_spoken_variation():
    from backend.voice_contracts import ParityStatus, compare_parity

    canonical = "Skicka 1 250,00 kr till Anna Andersson den 2026-08-20 kl 14:30. Kommando: skicka"
    spoken = "Skicka ett tusen två hundra femtio kronor till anna andersson den 20 augusti 2026 klockan 14 30"
    result = compare_parity(canonical, spoken)

    assert result["status"] is ParityStatus.MATCH
    assert result["mismatches"] == ()


def test_parity_detects_amount_mismatch():
    from backend.voice_contracts import ParityStatus, compare_parity

    result = compare_parity(
        "Betala 100 kr till Erik den 2026-08-20 kl 09:15. Kommando: betala",
        "Betala 900 kr till Erik den 2026-08-20 klockan 09 15",
    )

    assert result["status"] is ParityStatus.MISMATCH
    assert "amount" in result["mismatches"]


def test_parity_detects_date_mismatch():
    from backend.voice_contracts import ParityStatus, compare_parity

    result = compare_parity("den 2026-08-20", "den 2026-08-21")

    assert result["status"] is ParityStatus.MISMATCH
    assert "date" in result["mismatches"]


def test_parity_malformed_input_fails_closed():
    from backend.voice_contracts import ParityStatus, compare_parity

    result = compare_parity("", "")

    assert result["status"] is ParityStatus.ERROR
    assert result["telemetry"][0]["reason"] == "malformed_input"
