from __future__ import annotations

from model.llama_cpp_runtime import load_model as load_llama_cpp_model
from model.ollama_runtime import load_model as load_ollama_model
from utils.file_utils import AppError


def load_model(settings: dict):
    runtime = settings.get("runtime", "ollama")
    if runtime == "ollama":
        return load_ollama_model(settings)
    if runtime == "llama.cpp":
        return load_llama_cpp_model(settings)
    raise AppError("Unsupported runtime. Choose Ollama or llama.cpp.")

