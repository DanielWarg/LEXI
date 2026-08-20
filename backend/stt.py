"""Local speech-to-text for the hybrid Gemini voice path.

The normal path uses faster-whisper in the current interpreter.  On the
machine used for Lexi, faster-whisper is installed in system ``python3`` but
not in the project virtualenv, so a small subprocess fallback is included.
"""

import base64
import importlib.util
import json
import shutil
import struct
import subprocess
import sys
from typing import Any, Iterable, Optional


def amplify_pcm16(pcm: bytes, gain: float = 8.0) -> bytes:
    """Apply gain to little-endian PCM16 and clip instead of wrapping."""
    if len(pcm) % 2:
        raise ValueError("PCM16 byte count must be even")
    samples = struct.unpack(f"<{len(pcm) // 2}h", pcm) if pcm else ()
    amplified = (max(-32768, min(32767, int(sample * gain))) for sample in samples)
    return struct.pack(f"<{len(pcm) // 2}h", *amplified)


_SUBPROCESS_SCRIPT = r'''
import base64, json, os, struct, sys
import numpy as np
from faster_whisper import WhisperModel

request = json.loads(sys.stdin.read())
pcm = base64.b64decode(request["pcm"])
samples = struct.unpack(f"<{len(pcm) // 2}h", pcm) if pcm else ()
audio = np.array([sample / 32768.0 for sample in samples], dtype=np.float32)
model = WhisperModel(request["model"], device="auto", compute_type="auto")
segments, _ = model.transcribe(audio, language=request.get("language", "sv"), vad_filter=True)
print(json.dumps({"text": " ".join(segment.text.strip() for segment in segments).strip()}, ensure_ascii=False))
'''


class Transcriber:
    """Turn one or more PCM16 mono chunks into a normalized transcript."""

    def __init__(
        self,
        model: Optional[Any] = None,
        *,
        model_size: str = "large-v3-turbo",
        gain: float = 8.0,
        language: str = "sv",
        python_executable: Optional[str] = None,
    ) -> None:
        self.model = model
        self.model_size = model_size
        self.gain = gain
        self.language = language
        self.python_executable = python_executable or self._find_system_python()

    @staticmethod
    def _find_system_python() -> str:
        candidates = [
            "/usr/bin/python3",
            shutil.which("python3"),
        ]
        for candidate in candidates:
            if not candidate:
                continue
            try:
                subprocess.run(
                    [candidate, "-c", "import faster_whisper"],
                    check=True,
                    capture_output=True,
                )
                return candidate
            except (OSError, subprocess.SubprocessError):
                continue
        return "python3"

    def _load_model(self) -> Any:
        if self.model is None:
            from faster_whisper import WhisperModel

            self.model = WhisperModel(self.model_size, device="auto", compute_type="auto")
        return self.model

    def transcribe_pcm_chunks(self, chunks: Iterable[bytes]) -> str:
        pcm = b"".join(chunks)
        if not pcm:
            return ""
        amplified = amplify_pcm16(pcm, self.gain)

        if self.model is not None or importlib.util.find_spec("faster_whisper") is not None:
            model = self._load_model()
            samples = struct.unpack(f"<{len(amplified) // 2}h", amplified)
            import numpy as np
            audio = np.array([s / 32768.0 for s in samples], dtype=np.float32)
            segments, _ = model.transcribe(audio, language=self.language, vad_filter=True)
            return " ".join(segment.text.strip() for segment in segments).strip()

        return self._transcribe_in_subprocess(amplified)

    def _transcribe_in_subprocess(self, pcm: bytes) -> str:
        request = {
            "pcm": base64.b64encode(pcm).decode("ascii"),
            "model": self.model_size,
            "language": self.language,
        }
        result = subprocess.run(
            [self.python_executable, "-c", _SUBPROCESS_SCRIPT],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)["text"]
