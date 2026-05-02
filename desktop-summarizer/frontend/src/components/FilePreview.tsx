import { CheckCircle2, FileText, Loader2 } from "lucide-react";

interface FilePreviewProps {
  filename: string;
  fileType: string;
  status: string;
  isBusy: boolean;
}

export function FilePreview({
  filename,
  fileType,
  status,
  isBusy,
}: FilePreviewProps) {
  return (
    <section className="panel preview-panel">
      <div className="panel-heading">
        <h2>File Preview</h2>
        {isBusy ? (
          <Loader2 className="spin" size={18} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={18} aria-hidden="true" />
        )}
      </div>
      <div className="preview-row">
        <FileText size={20} aria-hidden="true" />
        <div>
          <span className="label">Filename</span>
          <strong>{filename || "No file selected"}</strong>
        </div>
      </div>
      <div className="meta-grid">
        <div>
          <span className="label">Type</span>
          <strong>{fileType || "Waiting"}</strong>
        </div>
        <div>
          <span className="label">Status</span>
          <strong>{status}</strong>
        </div>
      </div>
    </section>
  );
}

