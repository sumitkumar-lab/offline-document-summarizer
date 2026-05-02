interface ExtractedTextPanelProps {
  text: string;
  disabled: boolean;
  onChange: (text: string) => void;
}

export function ExtractedTextPanel({
  text,
  disabled,
  onChange,
}: ExtractedTextPanelProps) {
  return (
    <section className="panel text-panel">
      <div className="panel-heading">
        <h2>Extracted Text</h2>
        <span>{text.trim().length.toLocaleString()} chars</span>
      </div>
      <textarea
        value={text}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Extracted text will appear here."
      />
    </section>
  );
}

