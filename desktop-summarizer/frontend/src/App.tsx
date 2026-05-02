import { AlertCircle, FileText, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { extractFile, saveSummary, summarizeStream } from "./api/backend";
import { DropZone } from "./components/DropZone";
import { ExtractedTextPanel } from "./components/ExtractedTextPanel";
import { FilePreview } from "./components/FilePreview";
import { PrivacyNote } from "./components/PrivacyNote";
import { SettingsPage } from "./components/SettingsPage";
import { SummaryControls } from "./components/SummaryControls";
import { SummaryOutput } from "./components/SummaryOutput";
import type { AppSettings, SummaryLength, SummaryMode } from "./types";

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
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const canSummarize = useMemo(
    () => extractedText.trim().length > 0 && !isExtracting,
    [extractedText, isExtracting],
  );

  async function handleFileSelected(file: File) {
    setError("");
    setSummary("");
    setSummaryStatus("Idle");
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

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {activeView === "workspace" ? (
        <div className="workspace-grid">
          <div className="left-stack">
            <DropZone disabled={isExtracting || isSummarizing} onFileSelected={handleFileSelected} />
            <FilePreview
              filename={filename}
              fileType={fileType}
              status={extractionStatus}
              isBusy={isExtracting}
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
              disabled={isExtracting || isSummarizing}
              onChange={setExtractedText}
            />
            <SummaryOutput
              summary={summary}
              status={summaryStatus}
              isSummarizing={isSummarizing}
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

