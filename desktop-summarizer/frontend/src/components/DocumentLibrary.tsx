import { Archive, FileText, Loader2, Save, Trash2 } from "lucide-react";
import type { SavedDocumentSummary } from "../types";

interface DocumentLibraryProps {
  documents: SavedDocumentSummary[];
  activeDocumentId: string | null;
  status: string;
  canSaveCurrent: boolean;
  isBusy: boolean;
  onSaveCurrent: () => void;
  onOpenDocument: (documentId: string) => void;
  onDeleteDocument: (documentId: string) => void;
}

export function DocumentLibrary({
  documents,
  activeDocumentId,
  status,
  canSaveCurrent,
  isBusy,
  onSaveCurrent,
  onOpenDocument,
  onDeleteDocument,
}: DocumentLibraryProps) {
  return (
    <section className="panel library-panel">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <Archive size={18} aria-hidden="true" />
          <h2>My Documents</h2>
        </div>
        <span>{status}</span>
      </div>

      <button
        className="button secondary full-button"
        type="button"
        disabled={!canSaveCurrent || isBusy}
        onClick={onSaveCurrent}
      >
        {isBusy ? (
          <Loader2 className="spin" size={17} aria-hidden="true" />
        ) : (
          <Save size={17} aria-hidden="true" />
        )}
        Save Document
      </button>

      <div className="document-list">
        {documents.length ? (
          documents.map((document) => (
            <article
              className={`document-list-item ${
                document.id === activeDocumentId ? "active" : ""
              }`}
              key={document.id}
            >
              <button
                type="button"
                className="document-open-button"
                disabled={isBusy}
                onClick={() => onOpenDocument(document.id)}
              >
                <FileText size={17} aria-hidden="true" />
                <span>
                  <strong>{document.filename}</strong>
                  <small>
                    {document.fileType} - {document.textChars.toLocaleString()} chars
                    {document.summaryChars > 0 ? " - summary saved" : ""}
                  </small>
                </span>
              </button>
              <button
                className="icon-button"
                type="button"
                disabled={isBusy}
                title="Delete saved document"
                aria-label={`Delete ${document.filename}`}
                onClick={() => onDeleteDocument(document.id)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </article>
          ))
        ) : (
          <span className="empty-state">No saved documents yet.</span>
        )}
      </div>
    </section>
  );
}
