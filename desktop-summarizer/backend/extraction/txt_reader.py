from __future__ import annotations

from pathlib import Path

from utils.file_utils import AppError


ENCODINGS = ("utf-8-sig", "utf-8", "utf-16", "cp1252", "latin-1")


def extract_text_from_txt(file_path: str | Path) -> str:
    path = Path(file_path)
    last_error: Exception | None = None

    for encoding in ENCODINGS:
        try:
            text = path.read_text(encoding=encoding)
            if text.strip():
                return text.strip()
        except UnicodeDecodeError as exc:
            last_error = exc
        except Exception as exc:
            raise AppError(f"Text file extraction failed: {exc}") from exc

    if last_error:
        raise AppError(f"Could not decode this text file: {last_error}") from last_error
    raise AppError("The text file is empty.")

