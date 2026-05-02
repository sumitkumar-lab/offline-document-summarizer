import { ShieldCheck } from "lucide-react";

export function PrivacyNote() {
  return (
    <div className="privacy-note">
      <ShieldCheck size={18} aria-hidden="true" />
      <span>Your files never leave your computer. Text extraction and summarization run locally.</span>
    </div>
  );
}

