import type {
  AppSettings,
  ChatMessage,
  ChatStreamHandlers,
  ExtractResponse,
  SavedDocumentDetail,
  SavedDocumentSummary,
  SystemCheckResponse,
  SummaryLength,
  SummaryMode,
  SummaryStreamHandlers,
} from "../types";

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8765";

export async function checkSystem(settings: AppSettings): Promise<SystemCheckResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/system-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  } catch (error) {
    return {
      allReady: false,
      checkedAt: new Date().toISOString(),
      items: [
        {
          id: "backend",
          label: "Local backend",
          status: "missing",
          message: "The local backend is not running.",
          detail: "Start the app again or run the backend locally.",
        },
      ],
    };
  }

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

export async function extractFile(file: File): Promise<ExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/extract`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    throw new Error(
      "Local backend is not running. Start the app backend, then try again.",
    );
  }

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

export async function summarizeStream(args: {
  text: string;
  mode: SummaryMode;
  length: SummaryLength;
  settings: AppSettings;
  handlers: SummaryStreamHandlers;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: args.text,
        mode: args.mode,
        length: args.length,
        settings: args.settings,
      }),
    });
  } catch (error) {
    throw new Error(
      "Local backend is not running. Start the app backend, then try again.",
    );
  }

  if (!response.ok || !response.body) {
    throw new Error(await readApiError(response));
  }

  await readTokenStream(response, args.handlers, "Summarization failed.");
}

export async function chatStream(args: {
  text: string;
  question: string;
  history: ChatMessage[];
  settings: AppSettings;
  handlers: ChatStreamHandlers;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: args.text,
        question: args.question,
        history: args.history.map(({ role, content }) => ({ role, content })),
        settings: args.settings,
      }),
    });
  } catch (error) {
    throw new Error(
      "Local backend is not running. Start the app backend, then try again.",
    );
  }

  if (!response.ok || !response.body) {
    throw new Error(await readApiError(response));
  }

  await readTokenStream(response, args.handlers, "Document chat failed.");
}

export async function saveSummary(summary: string): Promise<string> {
  const fallbackSave = async () => {
    const response = await fetch(`${API_BASE}/save-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    });
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    const result = (await response.json()) as { path: string };
    return result.path;
  };

  try {
    if ((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: "summary.txt",
        filters: [{ name: "Text file", extensions: ["txt"] }],
      });
      if (!path) return "Save cancelled";
      await writeTextFile(path, summary.trim() + "\n");
      return path;
    }
  } catch (error) {
    return fallbackSave();
  }

  return fallbackSave();
}

export async function listDocuments(): Promise<SavedDocumentSummary[]> {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  const payload = (await response.json()) as { documents: SavedDocumentSummary[] };
  return payload.documents;
}

export async function getDocument(documentId: string): Promise<SavedDocumentDetail> {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(documentId)}`);
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return response.json();
}

export async function saveDocument(args: {
  id?: string | null;
  filename: string;
  fileType: string;
  text: string;
  summary: string;
}): Promise<SavedDocumentDetail> {
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return response.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") return payload.detail;
  } catch {
    return "The local backend returned an unreadable error.";
  }
  return "The local backend returned an error.";
}

function parseSse(block: string): { name: string; data: Record<string, unknown> } | null {
  const lines = block.split("\n");
  let name = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      name = line.slice("event:".length).trim();
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (!dataLines.length) return null;

  try {
    return { name, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

async function readTokenStream(
  response: Response,
  handlers: SummaryStreamHandlers,
  fallbackError: string,
): Promise<void> {
  if (!response.body) {
    throw new Error(fallbackError);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const event = parseSse(part);
      if (!event) continue;

      if (event.name === "token") {
        handlers.onToken(String(event.data.text ?? ""));
      } else if (event.name === "status") {
        handlers.onStatus(String(event.data.message ?? ""));
      } else if (event.name === "error") {
        const message = String(event.data.message ?? fallbackError);
        handlers.onError(message);
        throw new Error(message);
      }
    }
  }
}
