export type SummaryMode =
  | "concise"
  | "bullets"
  | "key_ideas"
  | "study_notes"
  | "action_items"
  | "eli10"
  | "meeting_notes"
  | "research_paper"
  | "legal_policy"
  | "email"
  | "x_thread"
  | "reddit_linkedin";
export type SummaryLength = "short" | "medium" | "detailed";
export type Runtime = "ollama" | "llama.cpp";
export type ChatRole = "user" | "assistant";

export interface AppSettings {
  runtime: Runtime;
  modelName: string;
  ggufModelPath: string;
  contextWindow: number;
  chunkSize: number;
  updateFeedUrl: string;
  autoCheckUpdates: boolean;
}

export interface ExtractResponse {
  filename: string;
  fileType: "image" | "pdf" | "txt";
  status: string;
  text: string;
}

export interface SummaryStreamHandlers {
  onToken: (token: string) => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export type ChatStreamHandlers = SummaryStreamHandlers;

export interface SavedDocumentSummary {
  id: string;
  filename: string;
  fileType: string;
  createdAt: string;
  updatedAt: string;
  textChars: number;
  summaryChars: number;
}

export interface SavedDocumentDetail extends SavedDocumentSummary {
  text: string;
  summary: string;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseName: string;
  releaseUrl: string;
  publishedAt: string;
  downloadUrl: string;
}

export type SystemCheckStatus = "ready" | "warning" | "missing";

export interface SystemCheckItem {
  id: string;
  label: string;
  status: SystemCheckStatus;
  message: string;
  detail: string;
}

export interface SystemCheckResponse {
  allReady: boolean;
  checkedAt: string;
  items: SystemCheckItem[];
}
