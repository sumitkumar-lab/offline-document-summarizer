from __future__ import annotations

from pathlib import Path
from typing import Iterator

from utils.file_utils import AppError


class LlamaCppRuntime:
    def __init__(self, model_path: str, context_window: int) -> None:
        if not model_path:
            raise AppError("Choose a local GGUF model path before using llama.cpp.")

        path = Path(model_path).expanduser()
        if not path.exists():
            raise AppError(f"GGUF model file was not found: {path}")

        try:
            from llama_cpp import Llama
        except ImportError as exc:
            raise AppError(
                "llama-cpp-python is not installed. Install backend/requirements-llama-cpp.txt to enable GGUF models."
            ) from exc

        self.model = Llama(
            model_path=str(path),
            n_ctx=context_window,
            n_threads=None,
            verbose=False,
        )

    def stream(self, prompt: str) -> Iterator[str]:
        try:
            for part in self.model(
                prompt,
                max_tokens=768,
                temperature=0.2,
                stream=True,
                stop=["</s>"],
            ):
                token = part.get("choices", [{}])[0].get("text", "")
                if token:
                    yield token
        except ValueError as exc:
            raise AppError(
                "Model context is too small for this prompt. Increase context window or reduce chunk size."
            ) from exc


def load_model(settings: dict) -> LlamaCppRuntime:
    return LlamaCppRuntime(
        model_path=settings.get("ggufModelPath", ""),
        context_window=int(settings.get("contextWindow", 4096)),
    )

