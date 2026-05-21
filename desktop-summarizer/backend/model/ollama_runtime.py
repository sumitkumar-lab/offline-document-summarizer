from __future__ import annotations

import json
import os
from typing import Iterator
from urllib.parse import urlparse

import requests

from utils.file_utils import AppError


LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}


class OllamaRuntime:
    def __init__(self, model_name: str, context_window: int) -> None:
        self.model_name = model_name or "gemma:2b"
        self.context_window = context_window
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        parsed = urlparse(self.base_url)
        if parsed.hostname not in LOCAL_HOSTS:
            raise AppError("Ollama must use a local-only URL such as http://127.0.0.1:11434.")

    def stream(self, prompt: str) -> Iterator[str]:
        payload = {
            "model": self.model_name,
            "system": (
                "You are a local document assistant. Return only the requested "
                "document output. Never include confirmations, greetings, or phrases like "
                "'Sure', 'Here is', or 'Here are'."
            ),
            "prompt": prompt,
            "stream": True,
            "options": {
                "num_ctx": self.context_window,
                "temperature": 0.2,
                "top_p": 0.9,
            },
        }

        try:
            with requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                stream=True,
                timeout=(5, 300),
            ) as response:
                if response.status_code == 404:
                    raise AppError(
                        f"Local Ollama model '{self.model_name}' was not found. Run: ollama pull {self.model_name}"
                    )
                response.raise_for_status()

                for line in response.iter_lines(decode_unicode=True):
                    if not line:
                        continue
                    data = json.loads(line)
                    if data.get("error"):
                        raise AppError(str(data["error"]))
                    token = data.get("response", "")
                    if token:
                        yield token
                    if data.get("done"):
                        break
        except requests.exceptions.ConnectionError as exc:
            raise AppError(
                "Ollama is not running locally. Start Ollama, then try again."
            ) from exc
        except requests.exceptions.Timeout as exc:
            raise AppError("The local model timed out while generating a summary.") from exc
        except requests.exceptions.HTTPError as exc:
            raise AppError(f"Ollama returned a local error: {exc}") from exc


def load_model(settings: dict) -> OllamaRuntime:
    return OllamaRuntime(
        model_name=settings.get("modelName", "gemma:2b"),
        context_window=int(settings.get("contextWindow", 4096)),
    )
