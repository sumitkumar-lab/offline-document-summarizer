import { Download, Sparkles } from "lucide-react";
import type { SummaryLength, SummaryMode } from "../types";

const SUMMARY_MODE_OPTIONS: Array<{ value: SummaryMode; label: string }> = [
  { value: "concise", label: "Concise paragraph" },
  { value: "bullets", label: "Bullet points" },
  { value: "key_ideas", label: "Key ideas only" },
  { value: "study_notes", label: "Study notes" },
  { value: "action_items", label: "Action items" },
  { value: "eli10", label: "Explain like I'm 10" },
  { value: "meeting_notes", label: "Meeting notes" },
  { value: "research_paper", label: "Research paper summary" },
  { value: "legal_policy", label: "Legal / policy summary" },
  { value: "email", label: "Email-style summary" },
  { value: "x_thread", label: "X post-style thread" },
  { value: "reddit_linkedin", label: "Reddit / LinkedIn posts" },
];

interface SummaryControlsProps {
  mode: SummaryMode;
  length: SummaryLength;
  isSummarizing: boolean;
  canSummarize: boolean;
  canSave: boolean;
  onModeChange: (mode: SummaryMode) => void;
  onLengthChange: (length: SummaryLength) => void;
  onSummarize: () => void;
  onSave: () => void;
}

export function SummaryControls({
  mode,
  length,
  isSummarizing,
  canSummarize,
  canSave,
  onModeChange,
  onLengthChange,
  onSummarize,
  onSave,
}: SummaryControlsProps) {
  return (
    <section className="panel controls-panel">
      <div className="control-grid">
        <label>
          Style
          <select
            value={mode}
            disabled={isSummarizing}
            onChange={(event) => onModeChange(event.target.value as SummaryMode)}
          >
            {SUMMARY_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Length
          <select
            value={length}
            disabled={isSummarizing}
            onChange={(event) => onLengthChange(event.target.value as SummaryLength)}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
      </div>

      <div className="button-row">
        <button
          className="button primary"
          type="button"
          disabled={!canSummarize || isSummarizing}
          onClick={onSummarize}
        >
          <Sparkles size={18} aria-hidden="true" />
          {isSummarizing ? "Summarizing" : "Summarize"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={!canSave || isSummarizing}
          onClick={onSave}
        >
          <Download size={18} aria-hidden="true" />
          Save Summary
        </button>
      </div>
    </section>
  );
}
