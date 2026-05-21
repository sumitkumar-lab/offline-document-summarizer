from __future__ import annotations

import re
from collections.abc import Iterator

from model.runtime import load_model
from summarizer.chunking import chunk_text, estimate_token_count
from utils.file_utils import AppError


RESERVED_CHAT_OUTPUT_TOKENS = 900
PROMPT_OVERHEAD_CHARS = 3500
MAX_HISTORY_MESSAGES = 6
MAX_SELECTED_CHUNKS = 6

STOPWORDS = {
    "about",
    "after",
    "again",
    "also",
    "and",
    "any",
    "are",
    "because",
    "been",
    "before",
    "between",
    "can",
    "could",
    "did",
    "does",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "into",
    "its",
    "more",
    "not",
    "our",
    "out",
    "should",
    "that",
    "the",
    "their",
    "then",
    "there",
    "these",
    "they",
    "this",
    "was",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
}


def iter_chat_events(
    text: str,
    question: str,
    history: list[dict[str, str]],
    settings: dict,
) -> Iterator[dict[str, str]]:
    if not text.strip():
        raise AppError("Extracted text is empty. Add text before asking questions.")
    if not question.strip():
        raise AppError("Enter a question about the document.")

    context_window = int(settings.get("contextWindow", 4096))
    safe_input_tokens = max(256, context_window - RESERVED_CHAT_OUTPUT_TOKENS)
    if safe_input_tokens <= 256:
        raise AppError("Model context is too small. Increase the context window setting.")

    document_is_large = estimate_token_count(text) > safe_input_tokens
    yield {
        "type": "status",
        "message": (
            "Finding relevant document context locally..."
            if document_is_large
            else "Reading document locally..."
        ),
    }

    context = select_relevant_context(
        text=text,
        question=question,
        settings=settings,
        safe_input_tokens=safe_input_tokens,
    )
    prompt = build_document_chat_prompt(
        context=context,
        question=question,
        history=history,
    )

    yield {"type": "status", "message": "Answering from the document locally..."}
    runtime = load_model(settings)
    for token in runtime.stream(prompt):
        yield {"type": "token", "text": token}


def select_relevant_context(
    text: str,
    question: str,
    settings: dict,
    safe_input_tokens: int,
) -> str:
    cleaned = text.strip()
    context_budget = max(1200, safe_input_tokens * 4 - PROMPT_OVERHEAD_CHARS)
    if len(cleaned) <= context_budget:
        return cleaned

    configured_chunk_size = int(settings.get("chunkSize", 9000))
    chunk_size = max(1000, min(configured_chunk_size, max(1000, context_budget // 3)))
    chunks = chunk_text(cleaned, max_chunk_size=chunk_size)
    keywords = _keywords(question)

    scored_chunks = [
        (_score_chunk(chunk, keywords), index, chunk)
        for index, chunk in enumerate(chunks)
    ]
    ranked_chunks = sorted(scored_chunks, key=lambda item: (-item[0], item[1]))

    selected: list[tuple[int, str]] = []
    used_chars = 0

    for score, index, chunk in ranked_chunks:
        if score <= 0 and selected:
            continue
        next_text = chunk.strip()
        next_size = len(next_text) + 40
        remaining = context_budget - used_chars
        if remaining <= 0:
            break
        if next_size > remaining:
            if remaining >= 500:
                selected.append((index, next_text[:remaining].rstrip()))
            break
        selected.append((index, next_text))
        used_chars += next_size
        if len(selected) >= MAX_SELECTED_CHUNKS:
            break

    if not selected:
        selected = _first_chunks_within_budget(chunks, context_budget)

    selected.sort(key=lambda item: item[0])
    return "\n\n".join(
        f"[Excerpt {position}]\n{chunk}"
        for position, (_index, chunk) in enumerate(selected, start=1)
    )


def build_document_chat_prompt(
    context: str,
    question: str,
    history: list[dict[str, str]],
) -> str:
    history_text = _format_history(history)
    history_section = f"Recent chat:\n{history_text}\n\n" if history_text else ""
    return (
        "You are answering questions about a document that was processed locally.\n"
        "Use only the document context and recent chat below. If the answer is not present "
        "in the document, say you cannot find it in the document. Do not invent facts. "
        "Keep the answer direct, helpful, and grounded in the document.\n\n"
        f"Document context:\n{context.strip()}\n\n"
        f"{history_section}"
        f"User question:\n{question.strip()}\n\n"
        "Answer:"
    )


def _format_history(history: list[dict[str, str]]) -> str:
    lines: list[str] = []
    for message in history[-MAX_HISTORY_MESSAGES:]:
        role = str(message.get("role", "")).strip().lower()
        content = str(message.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content[:1200]}")
    return "\n".join(lines)


def _keywords(question: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9][a-zA-Z0-9_-]{2,}", question.lower())
    return {word for word in words if word not in STOPWORDS}


def _score_chunk(chunk: str, keywords: set[str]) -> int:
    if not keywords:
        return 0
    lower_chunk = chunk.lower()
    return sum(lower_chunk.count(keyword) for keyword in keywords)


def _first_chunks_within_budget(chunks: list[str], context_budget: int) -> list[tuple[int, str]]:
    selected: list[tuple[int, str]] = []
    used_chars = 0
    for index, chunk in enumerate(chunks):
        next_text = chunk.strip()
        next_size = len(next_text) + 40
        remaining = context_budget - used_chars
        if remaining <= 0:
            break
        if next_size > remaining:
            if remaining >= 500:
                selected.append((index, next_text[:remaining].rstrip()))
            break
        selected.append((index, next_text))
        used_chars += next_size
    return selected
