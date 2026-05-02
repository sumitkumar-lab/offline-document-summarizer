from __future__ import annotations

from pathlib import Path
import shutil

from PIL import Image, ImageOps
import pytesseract

from utils.file_utils import AppError


WINDOWS_TESSERACT_PATHS = (
    Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
    Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
)


def extract_text_from_image(file_path: str | Path) -> str:
    path = Path(file_path)
    try:
        configure_tesseract()
        with Image.open(path) as image:
            normalized = ImageOps.grayscale(image)
            text = pytesseract.image_to_string(normalized)
    except pytesseract.TesseractNotFoundError as exc:
        raise AppError(
            "OCR failed because Tesseract is not installed or is not on PATH."
        ) from exc
    except Exception as exc:
        raise AppError(f"OCR failed for this image: {exc}") from exc

    if not text.strip():
        raise AppError("OCR finished, but no readable text was found in the image.")
    return text.strip()


def configure_tesseract() -> None:
    if shutil.which("tesseract"):
        return

    for candidate in WINDOWS_TESSERACT_PATHS:
        if candidate.exists():
            pytesseract.pytesseract.tesseract_cmd = str(candidate)
            return
