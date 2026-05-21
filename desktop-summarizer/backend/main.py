from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from extraction.image_ocr import extract_text_from_image
from extraction.pdf_reader import extract_text_from_pdf
from extraction.txt_reader import extract_text_from_txt
from summarizer.chat import iter_chat_events
from summarizer.summarize import iter_summary_events
from utils.document_store import (
    delete_document,
    get_document,
    list_documents,
    save_document,
)
from utils.file_utils import (
    AppError,
    get_file_type,
    is_supported_file,
    save_summary as write_summary_file,
)
from utils.system_check import run_system_check


APP_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = APP_ROOT.parent / "outputs"
DOCUMENTS_DIR = OUTPUT_DIR / "documents"


class Settings(BaseModel):
    runtime: str = Field(default="ollama")
    modelName: str = Field(default="gemma:2b")
    ggufModelPath: str = Field(default="")
    contextWindow: int = Field(default=4096, ge=512, le=32768)
    chunkSize: int = Field(default=9000, ge=1000, le=60000)


class SummarizeRequest(BaseModel):
    text: str
    mode: str = Field(default="concise")
    length: str = Field(default="medium")
    settings: Settings = Field(default_factory=Settings)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    text: str
    question: str
    history: list[ChatMessage] = Field(default_factory=list)
    settings: Settings = Field(default_factory=Settings)


class SaveDocumentRequest(BaseModel):
    id: str | None = None
    filename: str = Field(default="Untitled document")
    fileType: str = Field(default="Unknown")
    text: str
    summary: str = Field(default="")


class SaveSummaryRequest(BaseModel):
    summary: str
    outputPath: str | None = None


app = FastAPI(title="Offline Document Summarizer", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "privacy": "local-only",
        "ollamaApi": "http://127.0.0.1:11434",
    }


@app.post("/system-check")
def system_check(settings: Settings = Settings()) -> dict[str, Any]:
    return run_system_check(settings.model_dump())


@app.post("/extract")
async def extract(file: UploadFile = File(...)) -> dict[str, str]:
    filename = file.filename or "uploaded-file"
    if not is_supported_file(filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use PNG, JPG, JPEG, WEBP, PDF, or TXT.",
        )

    suffix = Path(filename).suffix.lower()
    temp_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = Path(tmp.name)
            while chunk := await file.read(1024 * 1024):
                tmp.write(chunk)

        file_type = get_file_type(filename)
        if file_type == "image":
            text = extract_text_from_image(temp_path)
        elif file_type == "pdf":
            text = extract_text_from_pdf(temp_path)
        elif file_type == "txt":
            text = extract_text_from_txt(temp_path)
        else:
            raise AppError("Unsupported file type.")

        if not text.strip():
            raise AppError("No readable text was found in this file.")

        return {
            "filename": filename,
            "fileType": file_type,
            "status": "Text extracted locally",
            "text": text,
        }
    except AppError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink(missing_ok=True)


def sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/summarize")
async def summarize(request: SummarizeRequest) -> StreamingResponse:
    def stream():
        try:
            for event in iter_summary_events(
                text=request.text,
                mode=request.mode,
                length=request.length,
                settings=request.settings.model_dump(),
            ):
                yield sse(event["type"], event)
            yield sse("done", {"type": "done"})
        except AppError as exc:
            yield sse("error", {"type": "error", "message": str(exc)})
        except Exception as exc:  # Keep UI friendly while preserving local-only processing.
            yield sse(
                "error",
                {
                    "type": "error",
                    "message": f"Summarization failed locally: {exc}",
                },
            )

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    def stream():
        try:
            for event in iter_chat_events(
                text=request.text,
                question=request.question,
                history=[message.model_dump() for message in request.history],
                settings=request.settings.model_dump(),
            ):
                yield sse(event["type"], event)
            yield sse("done", {"type": "done"})
        except AppError as exc:
            yield sse("error", {"type": "error", "message": str(exc)})
        except Exception as exc:  # Keep UI friendly while preserving local-only processing.
            yield sse(
                "error",
                {
                    "type": "error",
                    "message": f"Document chat failed locally: {exc}",
                },
            )

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/documents")
def documents() -> dict[str, Any]:
    return {"documents": list_documents(DOCUMENTS_DIR)}


@app.get("/documents/{document_id}")
def document(document_id: str) -> dict[str, object]:
    try:
        return get_document(DOCUMENTS_DIR, document_id)
    except AppError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/documents")
def save_document_route(request: SaveDocumentRequest) -> dict[str, object]:
    try:
        return save_document(
            documents_dir=DOCUMENTS_DIR,
            document_id=request.id,
            filename=request.filename,
            file_type=request.fileType,
            text=request.text,
            summary=request.summary,
        )
    except AppError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.delete("/documents/{document_id}")
def delete_document_route(document_id: str) -> dict[str, str]:
    try:
        delete_document(DOCUMENTS_DIR, document_id)
        return {"status": "Saved document deleted locally"}
    except AppError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/save-summary")
def save(request: SaveSummaryRequest) -> dict[str, str]:
    try:
        saved_path = write_summary_file(
            summary=request.summary,
            output_path=request.outputPath,
            output_dir=OUTPUT_DIR,
        )
        return {"path": str(saved_path), "status": "Summary saved locally"}
    except AppError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765, reload=False)
