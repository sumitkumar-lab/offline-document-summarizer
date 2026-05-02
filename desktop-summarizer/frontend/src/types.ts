export type SummaryMode = "concise" | "bullets" | "key_ideas" | "study_notes";
export type SummaryLength = "short" | "medium" | "detailed";
export type Runtime = "ollama" | "llama.cpp";

export interface AppSettings {
  runtime: Runtime;
  modelName: string;
  ggufModelPath: string;
  contextWindow: number;
  chunkSize: number;
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

