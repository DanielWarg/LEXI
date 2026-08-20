import struct
import sys
from pathlib import Path

import pytest

from backend.stt import Transcriber, amplify_pcm16

sys.path.insert(0, str(Path(__file__).parents[1]))


class FakeWhisperModel:
    def __init__(self):
        self.audio = None

    def transcribe(self, audio, **kwargs):
        self.audio = audio
        return [type("Segment", (), {"text": " hej världen "})()], {"language": "sv"}


def test_amplify_pcm16_applies_gain_and_clips():
    pcm = struct.pack("<hhh", 1000, -1000, 32000)

    amplified = amplify_pcm16(pcm, gain=8.0)

    assert struct.unpack("<hhh", amplified) == (8000, -8000, 32767)


def test_transcriber_converts_pcm_chunks_to_text():
    model = FakeWhisperModel()
    transcriber = Transcriber(model=model, gain=8.0)

    text = transcriber.transcribe_pcm_chunks([struct.pack("<hh", 1000, -1000)])

    assert text == "hej världen"
    assert model.audio == pytest.approx([8000 / 32768, -8000 / 32768])


@pytest.mark.asyncio
async def test_send_text_turn_uses_realtime_input():
    from lexi import AudioLoop

    class FakeSession:
        def __init__(self):
            self.calls = []

        async def send_realtime_input(self, **kwargs):
            self.calls.append(kwargs)

    loop = AudioLoop.__new__(AudioLoop)
    loop.session = FakeSession()

    await loop.send_text_turn("Hej Lexi")

    call = loop.session.calls[0]
    assert call == {"text": "Hej Lexi"}
