import { Download, Sparkles } from "lucide-react";
import type { SummaryLength, SummaryMode } from "../types";

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
            <option value="concise">Concise paragraph</option>
            <option value="bullets">Bullet points</option>
            <option value="key_ideas">Key ideas only</option>
            <option value="study_notes">Study notes</option>
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

