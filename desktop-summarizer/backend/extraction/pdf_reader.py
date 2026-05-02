from __future__ import annotations

from pathlib import Path

import pdfplumber
from pypdf import PdfReader

from utils.file_utils import AppError


def extract_text_from_pdf(file_path: str | Path) -> str:
    path = Path(file_path)
    text_parts: list[str] = []

    try:
        with pdfplumber.open(path) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_parts.append(f"--- Page {page_number} ---\n{page_text.strip()}")
    except Exception:
        text_parts = []

    if not text_parts:
        try:
            reader = PdfReader(str(path))
            for page_number, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_parts.append(f"--- Page {page_number} ---\n{page_text.strip()}")
        except Exception as exc:
            raise AppError(f"PDF extraction failed: {exc}") from exc

    if not text_parts:
        raise AppError(
            "PDF extraction found no selectable text. If this is a scanned PDF, convert pages to images and run OCR."
        )

    return "\n\n".join(text_parts)

