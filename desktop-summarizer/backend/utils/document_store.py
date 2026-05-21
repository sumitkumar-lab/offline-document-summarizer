from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from utils.file_utils import AppError


SAFE_ID = re.compile(r"^[a-zA-Z0-9_-]+$")


def list_documents(documents_dir: Path) -> list[dict[str, object]]:
    documents_dir.mkdir(parents=True, exist_ok=True)
    documents: list[dict[str, object]] = []

    for document_dir in documents_dir.iterdir():
        if not document_dir.is_dir():
            continue
        metadata_path = document_dir / "metadata.json"
        if not metadata_path.exists():
            continue
        try:
            documents.append(_read_metadata(metadata_path))
        except (OSError, json.JSONDecodeError):
            continue

    return sorted(
        documents,
        key=lambda item: str(item.get("updatedAt", "")),
        reverse=True,
    )


def get_document(documents_dir: Path, document_id: str) -> dict[str, object]:
    document_dir = _document_dir(documents_dir, document_id)
    metadata_path = document_dir / "metadata.json"
    if not metadata_path.exists():
        raise AppError("Saved document was not found.")

    metadata = _read_metadata(metadata_path)
    text = _read_text(document_dir / "extracted.txt")
    summary = _read_text(document_dir / "summary.txt")
    return {**metadata, "text": text, "summary": summary}


def save_document(
    documents_dir: Path,
    filename: str,
    file_type: str,
    text: str,
    summary: str,
    document_id: str | None = None,
) -> dict[str, object]:
    if not text.strip():
        raise AppError("Extracted text is empty. Add text before saving the document.")

    documents_dir.mkdir(parents=True, exist_ok=True)
    now = _timestamp()
    safe_document_id = document_id or uuid4().hex
    document_dir = _document_dir(documents_dir, safe_document_id)
    metadata_path = document_dir / "metadata.json"

    created_at = now
    if metadata_path.exists():
        try:
            existing = _read_metadata(metadata_path)
            created_at = str(existing.get("createdAt", now))
        except (OSError, json.JSONDecodeError):
            created_at = now

    document_dir.mkdir(parents=True, exist_ok=True)
    cleaned_filename = filename.strip() or "Untitled document"
    cleaned_file_type = file_type.strip() or "Unknown"
    cleaned_text = text.strip()
    cleaned_summary = summary.strip()

    metadata: dict[str, object] = {
        "id": safe_document_id,
        "filename": cleaned_filename,
        "fileType": cleaned_file_type,
        "createdAt": created_at,
        "updatedAt": now,
        "textChars": len(cleaned_text),
        "summaryChars": len(cleaned_summary),
    }

    (document_dir / "extracted.txt").write_text(cleaned_text + "\n", encoding="utf-8")
    (document_dir / "summary.txt").write_text(
        cleaned_summary + ("\n" if cleaned_summary else ""),
        encoding="utf-8",
    )
    metadata_path.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return {**metadata, "text": cleaned_text, "summary": cleaned_summary}


def delete_document(documents_dir: Path, document_id: str) -> None:
    document_dir = _document_dir(documents_dir, document_id)
    if not document_dir.exists():
        raise AppError("Saved document was not found.")

    for child in document_dir.iterdir():
        if child.is_file():
            child.unlink()
    document_dir.rmdir()


def _document_dir(documents_dir: Path, document_id: str) -> Path:
    if not SAFE_ID.fullmatch(document_id):
        raise AppError("Saved document id is invalid.")
    return documents_dir / document_id


def _read_metadata(metadata_path: Path) -> dict[str, object]:
    return json.loads(metadata_path.read_text(encoding="utf-8"))


def _read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
