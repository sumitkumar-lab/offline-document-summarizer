from __future__ import annotations

import re


def estimate_token_count(text: str) -> int:
    return max(1, len(text) // 4)


def chunk_text(text: str, max_chunk_size: int) -> list[str]:
    cleaned = re.sub(r"\n{3,}", "\n\n", text.strip())
    if len(cleaned) <= max_chunk_size:
        return [cleaned]

    paragraphs = re.split(r"\n\s*\n", cleaned)
    chunks: list[str] = []
    current: list[str] = []
    current_size = 0

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        if len(paragraph) > max_chunk_size:
            if current:
                chunks.append("\n\n".join(current))
                current = []
                current_size = 0
            chunks.extend(_split_long_text(paragraph, max_chunk_size))
            continue

        next_size = current_size + len(paragraph) + 2
        if current and next_size > max_chunk_size:
            chunks.append("\n\n".join(current))
            current = [paragraph]
            current_size = len(paragraph)
        else:
            current.append(paragraph)
            current_size = next_size

    if current:
        chunks.append("\n\n".join(current))

    return chunks


def _split_long_text(text: str, max_chunk_size: int) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if len(sentence) > max_chunk_size:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(
                sentence[i : i + max_chunk_size]
                for i in range(0, len(sentence), max_chunk_size)
            )
            continue

        if current and len(current) + len(sentence) + 1 > max_chunk_size:
            chunks.append(current.strip())
            current = sentence
        else:
            current = f"{current} {sentence}".strip()

    if current:
        chunks.append(current.strip())
    return chunks

