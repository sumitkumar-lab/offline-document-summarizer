import { FileUp, FolderOpen } from "lucide-react";
import { useRef, useState } from "react";

const ACCEPTED = ".png,.jpg,.jpeg,.webp,.pdf,.txt";

interface DropZoneProps {
  disabled: boolean;
  onFileSelected: (file: File) => void;
}

export function DropZone({ disabled, onFileSelected }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <section
      className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const file = event.dataTransfer.files.item(0);
        if (file) onFileSelected(file);
      }}
    >
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPTED}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) onFileSelected(file);
          event.currentTarget.value = "";
        }}
      />
      <div className="drop-zone-icon">
        <FileUp size={28} aria-hidden="true" />
      </div>
      <div>
        <h2>Drop a document</h2>
        <p>PNG, JPG, JPEG, WEBP, PDF, or TXT</p>
      </div>
      <button
        className="button secondary"
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <FolderOpen size={18} aria-hidden="true" />
        Choose File
      </button>
    </section>
  );
}

