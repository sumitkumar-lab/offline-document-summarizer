from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests


LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}
OLLAMA_URL = "http://127.0.0.1:11434"
WINDOWS_TESSERACT_PATHS = (
    Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
    Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
)


def run_system_check(settings: dict[str, Any]) -> dict[str, Any]:
    runtime = settings.get("runtime", "ollama")
    model_name = settings.get("modelName", "gemma:2b") or "gemma:2b"
    items = [
        _backend_item(),
        _tesseract_item(),
    ]

    if runtime == "ollama":
        items.extend(_ollama_items(model_name))
    elif runtime == "llama.cpp":
        items.extend(_llama_cpp_items(settings))
    else:
        items.append(
            _item(
                "runtime",
                "Model runtime",
                "missing",
                "Choose Ollama or llama.cpp in Settings.",
            )
        )

    return {
        "allReady": all(item["status"] == "ready" for item in items),
        "checkedAt": datetime.now().isoformat(timespec="seconds"),
        "items": items,
    }


def _backend_item() -> dict[str, str]:
    return _item(
        "backend",
        "Local backend",
        "ready",
        "Running on 127.0.0.1 only.",
    )


def _tesseract_item() -> dict[str, str]:
    path = _find_tesseract()
    if path:
        return _item(
            "tesseract",
            "Tesseract OCR",
            "ready",
            "Image OCR is available locally.",
            str(path),
        )
    return _item(
        "tesseract",
        "Tesseract OCR",
        "missing",
        "Install Tesseract OCR to extract text from images.",
        r"winget install --id tesseract-ocr.tesseract -e",
    )


def _ollama_items(model_name: str) -> list[dict[str, str]]:
    parsed = urlparse(OLLAMA_URL)
    if parsed.hostname not in LOCAL_HOSTS:
        return [
            _item(
                "ollama",
                "Ollama",
                "missing",
                "Ollama must use a local-only URL.",
            )
        ]

    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        response.raise_for_status()
        payload = response.json()
    except requests.exceptions.ConnectionError:
        return [
            _item(
                "ollama",
                "Ollama",
                "missing",
                "Start Ollama before summarizing.",
                "ollama serve",
            ),
            _item(
                "model",
                model_name,
                "missing",
                "Pull the local model after Ollama is running.",
                f"ollama pull {model_name}",
            ),
        ]
    except Exception as exc:
        return [
            _item(
                "ollama",
                "Ollama",
                "warning",
                "Ollama responded, but the model list could not be read.",
                str(exc),
            )
        ]

    names = {model.get("name", "") for model in payload.get("models", [])}
    installed = model_name in names

    return [
        _item(
            "ollama",
            "Ollama",
            "ready",
            "Local model server is running.",
            OLLAMA_URL,
        ),
        _item(
            "model",
            model_name,
            "ready" if installed else "missing",
            "Model is available locally."
            if installed
            else "Pull this model before summarizing.",
            "" if installed else f"ollama pull {model_name}",
        ),
    ]


def _llama_cpp_items(settings: dict[str, Any]) -> list[dict[str, str]]:
    model_path = settings.get("ggufModelPath", "")
    items: list[dict[str, str]] = []

    try:
        import llama_cpp  # noqa: F401

        items.append(
            _item(
                "llama_cpp",
                "llama-cpp-python",
                "ready",
                "GGUF runtime package is installed.",
            )
        )
    except ImportError:
        items.append(
            _item(
                "llama_cpp",
                "llama-cpp-python",
                "missing",
                "Install the optional GGUF runtime package.",
                r"pip install -r backend\requirements-llama-cpp.txt",
            )
        )

    if model_path and Path(model_path).expanduser().exists():
        items.append(
            _item(
                "gguf",
                "GGUF model",
                "ready",
                "Local GGUF model path exists.",
                model_path,
            )
        )
    else:
        items.append(
            _item(
                "gguf",
                "GGUF model",
                "missing",
                "Choose an existing local .gguf model file in Settings.",
                model_path or r"models\gemma-2b-it-q4.gguf",
            )
        )

    return items


def _find_tesseract() -> Path | str | None:
    path = shutil.which("tesseract")
    if path:
        return path
    for candidate in WINDOWS_TESSERACT_PATHS:
        if candidate.exists():
            return candidate
    return None


def _item(
    item_id: str,
    label: str,
    status: str,
    message: str,
    detail: str = "",
) -> dict[str, str]:
    return {
        "id": item_id,
        "label": label,
        "status": status,
        "message": message,
        "detail": detail,
    }

