import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { SystemCheckItem, SystemCheckResponse } from "../types";

interface SetupCheckProps {
  check: SystemCheckResponse | null;
  isChecking: boolean;
  onRefresh: () => void;
}

export function SetupCheck({ check, isChecking, onRefresh }: SetupCheckProps) {
  const items = check?.items ?? [];
  const title = check?.allReady ? "Local Setup Ready" : "Local Setup Check";

  return (
    <section className={`setup-check ${check?.allReady ? "is-ready" : ""}`}>
      <div className="setup-check-header">
        <div>
          <h2>{title}</h2>
          <p>{check ? formatCheckedAt(check.checkedAt) : "Checking local runtime..."}</p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onRefresh}
          disabled={isChecking}
          title="Refresh local setup check"
          aria-label="Refresh local setup check"
        >
          <RefreshCw className={isChecking ? "spin" : ""} size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="setup-items">
        {items.length ? (
          items.map((item) => <SetupItem key={item.id} item={item} />)
        ) : (
          <div className="setup-item">
            <RefreshCw className="spin" size={18} aria-hidden="true" />
            <div>
              <strong>Checking</strong>
              <span>Looking at local services and tools.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SetupItem({ item }: { item: SystemCheckItem }) {
  const Icon =
    item.status === "ready"
      ? CheckCircle2
      : item.status === "warning"
        ? AlertTriangle
        : XCircle;

  return (
    <div className={`setup-item status-${item.status}`}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{item.label}</strong>
        <span>{item.message}</span>
        {item.detail && <code>{item.detail}</code>}
      </div>
    </div>
  );
}

function formatCheckedAt(value: string): string {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last checked locally";
  return `Last checked ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
