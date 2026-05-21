import { AlertCircle, FileText, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  chatStream,
  checkSystem,
  deleteDocument,
  extractFile,
  getDocument,
  listDocuments,
  saveDocument,
  saveSummary,
  summarizeStream,
} from "./api/backend";
import { DocumentLibrary } from "./components/DocumentLibrary";
import { DocumentChat } from "./components/DocumentChat";
import { DropZone } from "./components/DropZone";
import { ExtractedTextPanel } from "./components/ExtractedTextPanel";
import { FilePreview } from "./components/FilePreview";
import { PrivacyNote } from "./components/PrivacyNote";
import { SettingsPage } from "./components/SettingsPage";
import { SetupCheck } from "./components/SetupCheck";
import { SummaryControls } from "./components/SummaryControls";
import { SummaryOutput } from "./components/SummaryOutput";
import type {
  AppSettings,
  ChatMessage,
  SavedDocumentSummary,
  SummaryLength,
  SummaryMode,
  SystemCheckResponse,
} from "./types";

const SETTINGS_KEY = "offline-document-summarizer-settings";

const DEFAULT_SETTINGS: AppSettings = {
  runtime: "ollama",
  modelName: "gemma:2b",
  ggufModelPath: "",
  contextWindow: 4096,
  chunkSize: 9000,
};

function App() {
  const [activeView, setActiveView] = useState<"workspace" | "settings">("workspace");
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [filename, setFilename] = useState("");
  const [fileType, setFileType] = useState("");
  const [extractionStatus, setExtractionStatus] = useState("Waiting");
  const [extractedText, setExtractedText] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryStatus, setSummaryStatus] = useState("Idle");
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("concise");
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatStatus, setChatStatus] = useState("Idle");
  const [savedDocuments, setSavedDocuments] = useState<SavedDocumentSummary[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [documentLibraryStatus, setDocumentLibraryStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const [systemCheck, setSystemCheck] = useState<SystemCheckResponse | null>(null);
  const [isCheckingSystem, setIsCheckingSystem] = useState(true);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    void refreshSystemCheck();
  }, [settings.runtime, settings.modelName, settings.ggufModelPath]);

  useEffect(() => {
    void refreshDocuments();
  }, []);

  const isDocumentBusy = isSavingDocument || isOpeningDocument;

  const canSummarize = useMemo(
    () => extractedText.trim().length > 0 && !isExtracting && !isChatting && !isDocumentBusy,
    [extractedText, isExtracting, isChatting, isDocumentBusy],
  );

  const canChat = useMemo(
    () => extractedText.trim().length > 0 && !isExtracting && !isSummarizing && !isDocumentBusy,
    [extractedText, isExtracting, isSummarizing, isDocumentBusy],
  );

  const canSaveDocument = useMemo(
    () =>
      extractedText.trim().length > 0 &&
      !isExtracting &&
      !isSummarizing &&
      !isChatting &&
      !isDocumentBusy,
    [extractedText, isExtracting, isSummarizing, isChatting, isDocumentBusy],
  );

  async function refreshSystemCheck() {
    setIsCheckingSystem(true);
    try {
      setSystemCheck(await checkSystem(settings));
    } catch (caught) {
      setSystemCheck({
        allReady: false,
        checkedAt: new Date().toISOString(),
        items: [
          {
            id: "system-check",
            label: "Local setup",
            status: "warning",
            message: getErrorMessage(caught),
            detail: "",
          },
        ],
      });
    } finally {
      setIsCheckingSystem(false);
    }
  }

  async function refreshDocuments() {
    setDocumentLibraryStatus("Loading");
    try {
      const documents = await listDocuments();
      setSavedDocuments(documents);
      setDocumentLibraryStatus(`${documents.length} saved`);
    } catch (caught) {
      setDocumentLibraryStatus("Unavailable");
      setError(getErrorMessage(caught));
    }
  }

  async function handleFileSelected(file: File) {
    setError("");
    setSummary("");
    setSummaryStatus("Idle");
    setChatMessages([]);
    setChatQuestion("");
    setChatStatus("Idle");
    setCurrentDocumentId(null);
    setDocumentLibraryStatus("Unsaved");
    setFilename(file.name);
    setFileType(guessFileType(file.name));
    setExtractionStatus("Extracting text locally...");
    setExtractedText("");
    setIsExtracting(true);

    try {
      const result = await extractFile(file);
      setFilename(result.filename);
      setFileType(formatFileType(result.fileType));
      setExtractionStatus(result.status);
      setExtractedText(result.text);
    } catch (caught) {
      setExtractionStatus("Extraction failed");
      setError(getErrorMessage(caught));
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSummarize() {
    if (!extractedText.trim()) {
      setError(filename ? "Empty extracted text." : "No file selected.");
      return;
    }

    setError("");
    setSummary("");
    setSummaryStatus("Starting local model...");
    setIsSummarizing(true);

    try {
      await summarizeStream({
        text: extractedText,
        mode: summaryMode,
        length: summaryLength,
        settings,
        handlers: {
          onToken: (token) => setSummary((current) => current + token),
          onStatus: (message) => setSummaryStatus(message),
          onError: (message) => setError(message),
        },
      });
      setSummaryStatus("Complete");
    } catch (caught) {
      setSummaryStatus("Failed");
      setError(getErrorMessage(caught));
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handleAskDocument() {
    const question = chatQuestion.trim();
    if (!extractedText.trim()) {
      setError(filename ? "Empty extracted text." : "No file selected.");
      return;
    }
    if (!question) {
      setError("Enter a question about the document.");
      return;
    }

    const history = chatMessages;
    const userMessage: ChatMessage = {
      id: createChatId(),
      role: "user",
      content: question,
    };
    const assistantMessage: ChatMessage = {
      id: createChatId(),
      role: "assistant",
      content: "",
    };

    setError("");
    setChatQuestion("");
    setChatStatus("Starting local model...");
    setIsChatting(true);
    setChatMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      await chatStream({
        text: extractedText,
        question,
        history,
        settings,
        handlers: {
          onToken: (token) => {
            setChatMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: message.content + token }
                  : message,
              ),
            );
          },
          onStatus: (message) => setChatStatus(message),
          onError: (message) => setError(message),
        },
      });
      setChatStatus("Complete");
    } catch (caught) {
      setChatStatus("Failed");
      setError(getErrorMessage(caught));
    } finally {
      setIsChatting(false);
    }
  }

  async function handleSaveDocument() {
    if (!extractedText.trim()) {
      setError(filename ? "Empty extracted text." : "No file selected.");
      return;
    }

    setError("");
    setIsSavingDocument(true);
    setDocumentLibraryStatus("Saving");
    try {
      const document = await saveDocument({
        id: currentDocumentId,
        filename: filename || "Untitled document",
        fileType: fileType || "Unknown",
        text: extractedText,
        summary,
      });
      setCurrentDocumentId(document.id);
      setFilename(document.filename);
      setFileType(document.fileType);
      setDocumentLibraryStatus("Saved");
      await refreshDocuments();
    } catch (caught) {
      setDocumentLibraryStatus("Save failed");
      setError(getErrorMessage(caught));
    } finally {
      setIsSavingDocument(false);
    }
  }

  async function handleOpenDocument(documentId: string) {
    setError("");
    setIsOpeningDocument(true);
    setDocumentLibraryStatus("Opening");
    try {
      const document = await getDocument(documentId);
      setCurrentDocumentId(document.id);
      setFilename(document.filename);
      setFileType(document.fileType);
      setExtractionStatus("Loaded from My Documents");
      setExtractedText(document.text);
      setSummary(document.summary);
      setSummaryStatus(document.summary.trim() ? "Loaded saved summary" : "No saved summary");
      setChatMessages([]);
      setChatQuestion("");
      setChatStatus("Idle");
      setDocumentLibraryStatus("Loaded");
    } catch (caught) {
      setDocumentLibraryStatus("Open failed");
      setError(getErrorMessage(caught));
    } finally {
      setIsOpeningDocument(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    const document = savedDocuments.find((item) => item.id === documentId);
    const name = document?.filename ?? "this saved document";
    if (!window.confirm(`Delete "${name}" from My Documents?`)) {
      return;
    }

    setError("");
    setIsOpeningDocument(true);
    setDocumentLibraryStatus("Deleting");
    try {
      await deleteDocument(documentId);
      if (currentDocumentId === documentId) {
        setCurrentDocumentId(null);
      }
      setDocumentLibraryStatus("Deleted");
      await refreshDocuments();
    } catch (caught) {
      setDocumentLibraryStatus("Delete failed");
      setError(getErrorMessage(caught));
    } finally {
      setIsOpeningDocument(false);
    }
  }

  async function handleSave() {
    if (!summary.trim()) {
      setError("There is no summary to save.");
      return;
    }

    setError("");
    try {
      const path = await saveSummary(summary);
      setSummaryStatus(path === "Save cancelled" ? "Save cancelled" : `Saved: ${path}`);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <FileText size={24} aria-hidden="true" />
          <div>
            <h1>Offline Document Summarizer</h1>
            <p>Private local OCR, extraction, and Gemma summaries</p>
          </div>
        </div>
        <nav className="view-tabs" aria-label="App sections">
          <button
            className={activeView === "workspace" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("workspace")}
          >
            Workspace
          </button>
          <button
            className={activeView === "settings" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("settings")}
          >
            <Settings size={16} aria-hidden="true" />
            Settings
          </button>
        </nav>
      </header>

      <PrivacyNote />

      <SetupCheck
        check={systemCheck}
        isChecking={isCheckingSystem}
        onRefresh={refreshSystemCheck}
      />

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {activeView === "workspace" ? (
        <div className="workspace-grid">
          <div className="left-stack">
            <DropZone
              disabled={isExtracting || isSummarizing || isChatting || isDocumentBusy}
              onFileSelected={handleFileSelected}
            />
            <FilePreview
              filename={filename}
              fileType={fileType}
              status={extractionStatus}
              isBusy={isExtracting}
            />
            <DocumentLibrary
              documents={savedDocuments}
              activeDocumentId={currentDocumentId}
              status={documentLibraryStatus}
              canSaveCurrent={canSaveDocument}
              isBusy={isDocumentBusy || isExtracting || isSummarizing || isChatting}
              onSaveCurrent={handleSaveDocument}
              onOpenDocument={handleOpenDocument}
              onDeleteDocument={handleDeleteDocument}
            />
            <SummaryControls
              mode={summaryMode}
              length={summaryLength}
              isSummarizing={isSummarizing}
              canSummarize={canSummarize}
              canSave={summary.trim().length > 0}
              onModeChange={setSummaryMode}
              onLengthChange={setSummaryLength}
              onSummarize={handleSummarize}
              onSave={handleSave}
            />
          </div>

          <div className="right-stack">
            <ExtractedTextPanel
              text={extractedText}
              disabled={isExtracting || isSummarizing || isChatting}
              onChange={setExtractedText}
            />
            <SummaryOutput
              summary={summary}
              status={summaryStatus}
              isSummarizing={isSummarizing}
            />
            <DocumentChat
              messages={chatMessages}
              question={chatQuestion}
              status={chatStatus}
              canChat={canChat}
              isChatting={isChatting}
              onQuestionChange={setChatQuestion}
              onAsk={handleAskDocument}
              onClear={() => {
                setChatMessages([]);
                setChatStatus("Idle");
              }}
            />
          </div>
        </div>
      ) : (
        <SettingsPage settings={settings} onChange={setSettings} />
      )}
    </main>
  );
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function createChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong locally.";
}

function guessFileType(filename: string): string {
  const suffix = filename.split(".").pop()?.toLowerCase();
  if (!suffix) return "Unknown";
  if (["png", "jpg", "jpeg", "webp"].includes(suffix)) return "Image";
  if (suffix === "pdf") return "PDF";
  if (suffix === "txt") return "TXT";
  return "Unsupported";
}

function formatFileType(type: string): string {
  if (type === "image") return "Image";
  if (type === "pdf") return "PDF";
  if (type === "txt") return "TXT";
  return type;
}

export default App;
