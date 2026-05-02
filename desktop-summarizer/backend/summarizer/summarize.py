from __future__ import annotations

from collections.abc import Iterator

from model.runtime import load_model
from summarizer.chunking import chunk_text, estimate_token_count
from summarizer.prompts import build_prompt
from utils.file_utils import AppError


RESERVED_OUTPUT_TOKENS = 900


def summarize_text(text: str, mode: str, length: str, settings: dict) -> Iterator[str]:
    if not text.strip():
        raise AppError("Extracted text is empty. Add text before summarizing.")
    runtime = load_model(settings)
    prompt = build_prompt(text=text, mode=mode, length=length)
    yield from runtime.stream(prompt)


def summarize_large_document(
    text: str,
    mode: str,
    length: str,
    settings: dict,
) -> Iterator[dict[str, str]]:
    chunk_size = int(settings.get("chunkSize", 9000))
    chunks = chunk_text(text, max_chunk_size=chunk_size)
    runtime = load_model(settings)
    partial_summaries: list[str] = []

    for index, chunk in enumerate(chunks, start=1):
        yield {
            "type": "status",
            "message": f"Summarizing chunk {index} of {len(chunks)} locally...",
        }
        prompt = build_prompt(text=chunk, mode=mode, length="short")
        partial = "".join(runtime.stream(prompt)).strip()
        if partial:
            partial_summaries.append(partial)

    if not partial_summaries:
        raise AppError("The model did not return any chunk summaries.")

    combined = "\n\n".join(
        f"Chunk {index}: {summary}"
        for index, summary in enumerate(partial_summaries, start=1)
    )
    yield {
        "type": "status",
        "message": "Combining chunk summaries into the final summary...",
    }
    final_prompt = build_prompt(text=combined, mode=mode, length=length)
    for token in runtime.stream(final_prompt):
        yield {"type": "token", "text": token}


def iter_summary_events(
    text: str,
    mode: str,
    length: str,
    settings: dict,
) -> Iterator[dict[str, str]]:
    if not text.strip():
        raise AppError("Extracted text is empty. Add text before summarizing.")

    context_window = int(settings.get("contextWindow", 4096))
    safe_input_tokens = max(256, context_window - RESERVED_OUTPUT_TOKENS)
    estimated_tokens = estimate_token_count(text)

    if safe_input_tokens <= 256:
        raise AppError("Model context is too small. Increase the context window setting.")

    if estimated_tokens <= safe_input_tokens:
        yield {"type": "status", "message": "Summarizing locally..."}
        for token in summarize_text(text=text, mode=mode, length=length, settings=settings):
            yield {"type": "token", "text": token}
        return

    yield {
        "type": "status",
        "message": "Large document detected. Using chunked local summarization...",
    }
    yield from summarize_large_document(text=text, mode=mode, length=length, settings=settings)

