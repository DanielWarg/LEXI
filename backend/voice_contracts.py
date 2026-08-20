"""Dependency-free contracts for the voice playback and transcription paths."""

import asyncio
from typing import Any, Optional


class QueueFullError(RuntimeError):
    """Raised when a playback queue has reached its hard capacity."""


class QueueCancelledError(RuntimeError):
    """Raised when an operation targets a permanently cancelled queue."""


class PlaybackQueue:
    """A small FIFO queue with explicit backpressure and terminal disposal."""

    def __init__(self, maxsize: int) -> None:
        if maxsize <= 0:
            raise ValueError("maxsize must be greater than zero")
        self.maxsize = maxsize
        self._items = []
        self._cancelled = False
        self._condition = asyncio.Condition()

    @property
    def qsize(self) -> int:
        return len(self._items)

    @property
    def empty(self) -> bool:
        return not self._items

    @property
    def cancelled(self) -> bool:
        return self._cancelled

    def _check_cancelled(self) -> None:
        if self._cancelled:
            raise QueueCancelledError("playback queue is cancelled")

    def put(self, item: Any) -> None:
        """Put an item immediately, raising instead of silently dropping it."""
        self._check_cancelled()
        if self.qsize >= self.maxsize:
            raise QueueFullError("playback queue is full")
        self._items.append(item)
        self._notify_waiters()

    put_nowait = put

    async def put_async(self, item: Any) -> None:
        """Put an item, blocking (backpressure) when full instead of crashing."""
        async with self._condition:
            while self.qsize >= self.maxsize:
                if self._cancelled:
                    raise QueueCancelledError("playback queue is cancelled")
                await self._condition.wait()
            self._check_cancelled()
            self._items.append(item)
            self._condition.notify_all()

    async def get(self) -> Any:
        async with self._condition:
            while not self._items:
                if self._cancelled:
                    raise QueueCancelledError("playback queue is cancelled")
                await self._condition.wait()
            self._check_cancelled()
            item = self._items.pop(0)
            self._condition.notify_all()
            return item

    def get_nowait(self) -> Any:
        self._check_cancelled()
        if not self._items:
            raise asyncio.QueueEmpty
        return self._items.pop(0)

    def clear(self) -> int:
        self._check_cancelled()
        count = len(self._items)
        self._items.clear()
        self._notify_waiters()
        return count

    def cancel(self) -> None:
        """Permanently cancel this queue; it can never be resumed."""
        if self._cancelled:
            return
        self._cancelled = True
        self._items.clear()
        self._notify_waiters()

    stop = cancel

    def _notify_waiters(self) -> None:
        """Wake async getters without requiring an event loop for normal puts."""
        if self._condition.locked():
            self._condition.notify_all()
        else:
            async def notify() -> None:
                async with self._condition:
                    self._condition.notify_all()

            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                return
            loop.create_task(notify())


class PlaybackGeneration:
    """Associates playback chunks with the currently valid response generation."""

    def __init__(self, queue: PlaybackQueue) -> None:
        self.queue = queue
        self._generation = 0

    @property
    def generation(self) -> int:
        return self._generation

    def new_generation(self) -> int:
        self._generation += 1
        return self._generation

    def is_current(self, generation: int) -> bool:
        return generation == self._generation

    def clear(self, generation: Optional[int] = None) -> int:
        """Clear pending audio and advance the token used for future chunks."""
        if generation is not None and generation > self._generation:
            self._generation = generation
        self.queue.clear()
        return self.new_generation()

    def put(self, generation: int, item: Any) -> bool:
        """Queue only chunks belonging to the current generation."""
        if not self.is_current(generation):
            return False
        self.queue.put(item)
        return True

    async def put_async(self, generation: int, item: Any) -> bool:
        """Queue current-generation chunks with backpressure (never crashes on full)."""
        if not self.is_current(generation):
            return False
        await self.queue.put_async(item)
        return True


class TranscriptionBuffer:
    """Turn cumulative transcription events into new-text-only deltas."""

    def __init__(self) -> None:
        self._previous = ""

    @property
    def previous(self) -> str:
        return self._previous

    def process(self, cumulative_text: str) -> str:
        if not cumulative_text or not cumulative_text.strip():
            return ""
        if len(cumulative_text) < len(self._previous):
            delta = cumulative_text
        elif cumulative_text.startswith(self._previous):
            delta = cumulative_text[len(self._previous):]
        else:
            delta = cumulative_text
        self._previous = cumulative_text
        return delta

    def reset(self) -> None:
        self._previous = ""


def mono_to_stereo_pcm16(mono: bytes) -> bytes:
    """Convert mono PCM16 (16-bit little-endian) to stereo by duplicating samples.

    Deterministic replacement for the deprecated ``audioop.tostereo(data, 2, 1, 1)``.
    A mono sample ``XY`` becomes stereo ``XYXY`` (same value on left and right).
    Rejects an odd byte count (a mono 16-bit buffer must have an even number of
    bytes, otherwise it is malformed).
    """
    if len(mono) % 2 != 0:
        raise ValueError(f"mono PCM16 byte count must be even, got {len(mono)}")
    return b"".join(mono[i : i + 2] + mono[i : i + 2] for i in range(0, len(mono), 2))


# --- Canonical-field parity (FAS 5.3) ---------------------------------------

_MONTHS = {
    "januari": "01", "februari": "02", "mars": "03", "april": "04",
    "maj": "05", "juni": "06", "juli": "07", "augusti": "08",
    "september": "09", "oktober": "10", "november": "11", "december": "12",
}
_WORD_NUMBERS = {
    "noll": 0, "ett": 1, "en": 1, "två": 2, "tre": 3, "fyra": 4, "fem": 5,
    "sex": 6, "sju": 7, "åtta": 8, "nio": 9, "tio": 10, "elva": 11, "tolv": 12,
    "tretton": 13, "fjorton": 14, "femton": 15, "sexton": 16, "sjutton": 17,
    "arton": 18, "nitton": 19, "tjugo": 20, "trettio": 30, "fyrtio": 40,
    "femtio": 50, "hundra": 100, "tusen": 1000,
}
_WORD_NUMBERS.update({"tva": 2, "atta": 8})


def _clean(value: str) -> str:
    import re
    import unicodedata

    folded = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", folded.lower()).strip()


def _amount(text: str) -> str | None:
    import re

    match = re.search(r"(?<!\w)([\d .]+)(?:[,\\.]\d{1,2})?\s*(?:kr|sek|kronor)", text, re.I)
    if match:
        return re.sub(r"[^0-9]", "", match.group(1))
    before_recipient = re.split(r"\s+(?:till|to|mottagare)\s+", _clean(text), maxsplit=1)[0]
    words = [_WORD_NUMBERS.get(w) for w in before_recipient.split()]
    values = [v for v in words if v is not None]
    if not values:
        return None
    total = 0
    current = 0
    for value in values:
        if value == 1000:
            total += max(current, 1) * 1000
            current = 0
        elif value == 100:
            current = max(current, 1) * 100
        else:
            current += value
    return str(total + current) if (total + current) else None


def _canonical_fields(text: str) -> dict[str, str]:
    import re

    cleaned = _clean(text)
    result: dict[str, str] = {}
    recipient = re.search(
        r"(?:till|to|mottagare)\s+([a-z]+(?:\s+[a-z]+){0,2}?)"
        r"(?=\s+(?:den|at|kl|klockan|kommando|command)|$)",
        cleaned,
    )
    if recipient:
        result["recipient"] = recipient.group(1).strip()
    amount = _amount(text)
    if amount:
        result["amount"] = amount
    date = re.search(r"(20\d{2})[- /](\d{1,2})[- /](\d{1,2})", cleaned)
    if date:
        result["date"] = f"{date.group(1)}-{int(date.group(2)):02d}-{int(date.group(3)):02d}"
    else:
        named = re.search(rf"(\d{{1,2}})\s+({'|'.join(_MONTHS)})\s+(20\d{{2}})", cleaned)
        if named:
            result["date"] = f"{named.group(3)}-{_MONTHS[named.group(2)]}-{int(named.group(1)):02d}"
    clock = re.search(r"(?:kl|klockan|at)\s+(\d{1,2})\s*[: ]\s*(\d{2})", cleaned)
    if clock:
        result["time"] = f"{int(clock.group(1)):02d}:{clock.group(2)}"
    command = re.search(r"(?:kommando|command)\s*[: ]\s*([a-z]+)", cleaned)
    if command:
        result["command"] = command.group(1)
    elif cleaned:
        result["command"] = cleaned.split()[0]
    return result


class ParityStatus:
    MATCH = "match"
    MISMATCH = "mismatch"
    ERROR = "error"


def compare_parity(canonical_text: str, spoken_text: str) -> dict:
    """Compare canonical Hermes text against a spoken transcription.

    Returns {"status", "mismatches", "canonical_text", "telemetry"}.
    Never mutates or rewrites canonical text. Malformed/unknown input fails
    closed to ERROR — never a silent MATCH.
    """
    if not isinstance(canonical_text, str) or not isinstance(spoken_text, str):
        return {
            "status": ParityStatus.ERROR,
            "mismatches": (),
            "canonical_text": str(canonical_text),
            "telemetry": ({"field": "input", "reason": "malformed_input"},),
        }
    if not canonical_text.strip() or not spoken_text.strip():
        return {
            "status": ParityStatus.ERROR,
            "mismatches": (),
            "canonical_text": canonical_text,
            "telemetry": ({"field": "input", "reason": "malformed_input"},),
        }
    canonical = _canonical_fields(canonical_text)
    spoken = _canonical_fields(spoken_text)
    if not canonical:
        return {
            "status": ParityStatus.ERROR,
            "mismatches": (),
            "canonical_text": canonical_text,
            "telemetry": ({"field": "input", "reason": "no_canonical_fields"},),
        }
    mismatches = tuple(f for f, v in canonical.items() if spoken.get(f) != v)
    return {
        "status": ParityStatus.MISMATCH if mismatches else ParityStatus.MATCH,
        "mismatches": mismatches,
        "canonical_text": canonical_text,
        "telemetry": [{"field": f, "reason": "field_mismatch"} for f in mismatches],
    }

