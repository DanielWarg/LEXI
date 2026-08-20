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

    async def get(self) -> Any:
        async with self._condition:
            while not self._items:
                if self._cancelled:
                    raise QueueCancelledError("playback queue is cancelled")
                await self._condition.wait()
            self._check_cancelled()
            return self._items.pop(0)

    def get_nowait(self) -> Any:
        self._check_cancelled()
        if not self._items:
            raise asyncio.QueueEmpty
        return self._items.pop(0)

    def clear(self) -> int:
        self._check_cancelled()
        count = len(self._items)
        self._items.clear()
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

