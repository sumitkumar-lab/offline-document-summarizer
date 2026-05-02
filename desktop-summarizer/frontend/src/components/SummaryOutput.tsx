import { Loader2 } from "lucide-react";

interface SummaryOutputProps {
  summary: string;
  status: string;
  isSummarizing: boolean;
}

export function SummaryOutput({
  summary,
  status,
  isSummarizing,
}: SummaryOutputProps) {
  return (
    <section className="panel summary-panel">
      <div className="panel-heading">
        <h2>Summary</h2>
        <div className="status-pill">
          {isSummarizing && <Loader2 className="spin" size={15} aria-hidden="true" />}
          <span>{status}</span>
        </div>
      </div>
      <div className="summary-output" aria-live="polite">
        {summary ? (
          <>
            {summary}
            {isSummarizing && <span className="cursor" aria-hidden="true" />}
          </>
        ) : (
          <span className="empty-state">The local model output will appear here.</span>
        )}
      </div>
    </section>
  );
}

