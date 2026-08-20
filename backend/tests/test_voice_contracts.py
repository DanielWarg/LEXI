import asyncio

import pytest

from backend.voice_contracts import (
    PlaybackGeneration,
    PlaybackQueue,
    QueueCancelledError,
    QueueFullError,
    TranscriptionBuffer,
)


def test_playback_queue_is_bounded_and_preserves_fifo_order():
    queue = PlaybackQueue(maxsize=2)

    queue.put("first")
    queue.put("second")

    assert queue.qsize == 2
    assert queue.get_nowait() == "first"
    assert queue.get_nowait() == "second"
    assert queue.empty


def test_playback_queue_raises_when_full():
    queue = PlaybackQueue(maxsize=1)
    queue.put("audio")

    with pytest.raises(QueueFullError):
        queue.put("more audio")


def test_playback_queue_clear_discards_pending_chunks():
    queue = PlaybackQueue(maxsize=3)
    queue.put("old-1")
    queue.put("old-2")

    assert queue.clear() == 2
    assert queue.empty


@pytest.mark.asyncio
async def test_playback_queue_cancel_is_terminal_for_put_and_get():
    queue = PlaybackQueue(maxsize=1)
    queue.cancel()

    assert queue.cancelled
    with pytest.raises(QueueCancelledError):
        queue.put("late")
    with pytest.raises(QueueCancelledError):
        await queue.get()


@pytest.mark.asyncio
async def test_playback_queue_async_get_preserves_order():
    queue = PlaybackQueue(maxsize=2)
    queue.put("one")
    queue.put("two")

    assert await queue.get() == "one"
    assert await queue.get() == "two"


def test_generation_clear_invalidates_late_chunks():
    queue = PlaybackQueue(maxsize=4)
    generations = PlaybackGeneration(queue)
    first = generations.new_generation()

    assert generations.put(first, "before")
    second = generations.clear(first)

    assert second == first + 1
    assert queue.empty
    assert not generations.put(first, "late")
    assert generations.put(second, "current")
    assert queue.get_nowait() == "current"


def test_generation_clear_without_argument_starts_new_generation():
    generations = PlaybackGeneration(PlaybackQueue(maxsize=2))

    first = generations.generation
    second = generations.clear()

    assert second == first + 1


def test_transcription_buffer_returns_cumulative_deltas():
    buffer = TranscriptionBuffer()

    assert buffer.process("hello") == "hello"
    assert buffer.process("hello world") == " world"
    assert buffer.process("hello world") == ""


def test_transcription_buffer_shorter_text_resets_utterance():
    buffer = TranscriptionBuffer()
    buffer.process("a longer utterance")

    assert buffer.process("new") == "new"
    assert buffer.process("new utterance") == " utterance"


def test_transcription_buffer_empty_text_is_ignored():
    buffer = TranscriptionBuffer()

    assert buffer.process("") == ""
    assert buffer.process("   ") == ""
    assert buffer.previous == ""

