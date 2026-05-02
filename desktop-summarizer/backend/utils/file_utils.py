from __future__ import annotations

from datetime import datetime
from pathlib import Path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
PDF_EXTENSIONS = {".pdf"}
TXT_EXTENSIONS = {".txt"}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | PDF_EXTENSIONS | TXT_EXTENSIONS


class AppError(Exception):
    pass


def is_supported_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in SUPPORTED_EXTENSIONS


def get_file_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in PDF_EXTENSIONS:
        return "pdf"
    if suffix in TXT_EXTENSIONS:
        return "txt"
    return "unsupported"


def save_summary(
    summary: str,
    output_path: str | None = None,
    output_dir: str | Path | None = None,
) -> Path:
    if not summary.strip():
        raise AppError("There is no summary to save.")

    if output_path:
        path = Path(output_path).expanduser()
    else:
        output_root = Path(output_dir or "outputs")
        output_root.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = output_root / f"summary-{timestamp}.txt"

    if path.suffix.lower() != ".txt":
        path = path.with_suffix(".txt")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(summary.strip() + "\n", encoding="utf-8")
    return path

