# Offline Document Summarizer

A private desktop assistant for local document text extraction and offline summarization with Gemma through Ollama first, with a llama.cpp/GGUF path prepared for later.

The app never sends uploaded files, extracted text, summaries, or metadata to an external server. The UI talks only to a Python backend on `127.0.0.1`, and the default model runtime talks only to Ollama on `127.0.0.1:11434`.

## What Is Built

- Tauri + React desktop UI in `frontend/`
- Local Python backend in `backend/`
- Local OCR for PNG, JPG, JPEG, and WEBP through Tesseract + `pytesseract`
- Local PDF text extraction through `pdfplumber`, with `pypdf` fallback
- TXT reading with UTF-8 and fallback encodings
- Streaming summary output through Server-Sent Events
- Ollama runtime using `gemma:2b`
- llama.cpp runtime scaffold using `llama-cpp-python` and a local `.gguf` model path
- Large document fallback: chunk, summarize chunks, then summarize combined chunk summaries
- Settings screen for runtime, model name, GGUF path, context window, and chunk size

## Project Structure

```text
desktop-summarizer/
  frontend/
    src/
      api/
      components/
      App.tsx
      main.tsx
      styles.css
    src-tauri/
  backend/
    main.py
    extraction/
      image_ocr.py
      pdf_reader.py
      txt_reader.py
    model/
      ollama_runtime.py
      llama_cpp_runtime.py
      runtime.py
    summarizer/
      chunking.py
      prompts.py
      summarize.py
    utils/
      file_utils.py
  models/
  outputs/
```

## Windows Setup

Run these commands from the `desktop-summarizer` folder.

### 1. Install Python

Install Python 3.11 or newer from:

```text
https://www.python.org/downloads/windows/
```

During installation, enable **Add python.exe to PATH**.

### 2. Install Python Dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 3. Install Tesseract OCR

Install the Windows build of Tesseract OCR, then make sure the install folder is on `PATH`.

Common install path:

```text
C:\Program Files\Tesseract-OCR
```

Check it:

```powershell
tesseract --version
```

### 4. Install Ollama

Install Ollama for Windows:

```text
https://ollama.com/download/windows
```

Start Ollama, then pull Gemma:

```powershell
ollama pull gemma:2b
```

### 5. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

### 6. Run the App in Development

From `desktop-summarizer\frontend`:

```powershell
npm run tauri:dev
```

This starts:

- the Python backend at `http://127.0.0.1:8765`
- the React UI at `http://127.0.0.1:5173`
- the Tauri desktop window

### 7. Test Files

Try one file from each supported input type:

- image document page: `.png`, `.jpg`, `.jpeg`, or `.webp`
- PDF with selectable text: `.pdf`
- plain text file: `.txt`

Drop the file into the app, review/edit the extracted text, choose a summary style, click **Summarize**, then save the result.

## Building a Windows Installer or Package

Install Rust and Tauri prerequisites first:

```text
https://www.rust-lang.org/tools/install
https://tauri.app/start/prerequisites/
```

Install PyInstaller:

```powershell
pip install -r backend\requirements-build.txt
```

Build the backend sidecar from the project root:

```powershell
cd backend
pyinstaller --name offline-summarizer-backend --onefile main.py
cd ..
New-Item -ItemType Directory -Force backend-dist
Copy-Item backend\dist\offline-summarizer-backend.exe backend-dist\offline-summarizer-backend-x86_64-pc-windows-msvc.exe
```

Build the Tauri app:

```powershell
cd frontend
npm run tauri:build
```

If Git's `link.exe` appears before the MSVC linker on PATH, run the build from **x64 Native Tools Command Prompt for VS 2022** or prepend the MSVC linker directory before building.

The Windows bundle is created under:

```text
frontend\src-tauri\target\release\bundle\
```

## llama.cpp / GGUF Runtime

Ollama is the first supported runtime. llama.cpp support is scaffolded for local GGUF models.

Install the optional dependency:

```powershell
pip install -r backend\requirements-llama-cpp.txt
```

Place a quantized Gemma GGUF file under `models/`, for example:

```text
models/gemma-2b-it-q4.gguf
```

In the app settings:

- Runtime: `llama.cpp`
- GGUF model path: `models/gemma-2b-it-q4.gguf`
- Context window: match the model and your machine

## Offline Notes

After setup, the app can run without an Internet connection as long as:

- Ollama is installed
- the model has already been pulled locally with `ollama pull gemma:2b`
- Python dependencies and Tesseract OCR are installed
- the desktop package includes the backend sidecar, or the backend is started locally during development

No remote model APIs are used.

## Desktop installer
```bash
D:\offline_llm\desktop-summarizer\frontend\src-tauri\target\release\bundle\nsis\Offline Document Summarizer_0.1.0_x64-setup.exe
```
After installing, launch Offline Document Summarizer from the Start Menu. Ollama should be installed and gemma:2b is already pulled locally on this machine.