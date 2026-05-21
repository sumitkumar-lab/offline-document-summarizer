import { Cpu, ExternalLink, RefreshCw, Save } from "lucide-react";
import type { AppSettings, Runtime, UpdateCheckResult } from "../types";

interface SettingsPageProps {
  settings: AppSettings;
  appVersion: string;
  updateStatus: string;
  updateResult: UpdateCheckResult | null;
  isCheckingUpdates: boolean;
  onCheckUpdates: () => void;
  onChange: (settings: AppSettings) => void;
}

export function SettingsPage({
  settings,
  appVersion,
  updateStatus,
  updateResult,
  isCheckingUpdates,
  onCheckUpdates,
  onChange,
}: SettingsPageProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <section className="settings-page">
      <div className="settings-title">
        <Cpu size={22} aria-hidden="true" />
        <div>
          <h2>Settings</h2>
          <p>Local model runtime and chunking controls</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-heading">
          <h3>Model</h3>
        </div>

        <div className="settings-grid">
        <label>
          Runtime
          <select
            value={settings.runtime}
            onChange={(event) => update("runtime", event.target.value as Runtime)}
          >
            <option value="ollama">Ollama</option>
            <option value="llama.cpp">llama.cpp</option>
          </select>
        </label>

        <label>
          Model name
          <input
            value={settings.modelName}
            onChange={(event) => update("modelName", event.target.value)}
            placeholder="gemma:2b"
          />
        </label>

        <label className="full-width">
          GGUF model path
          <input
            value={settings.ggufModelPath}
            onChange={(event) => update("ggufModelPath", event.target.value)}
            placeholder="models/gemma-2b-it-q4.gguf"
          />
        </label>

        <label>
          Context window
          <input
            type="number"
            min={512}
            max={32768}
            step={512}
            value={settings.contextWindow}
            onChange={(event) => update("contextWindow", Number(event.target.value))}
          />
        </label>

        <label>
          Chunk size
          <input
            type="number"
            min={1000}
            max={60000}
            step={500}
            value={settings.chunkSize}
            onChange={(event) => update("chunkSize", Number(event.target.value))}
          />
        </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-heading">
          <h3>Updates</h3>
          <span>Current version {appVersion}</span>
        </div>

        <div className="settings-grid">
          <label className="full-width">
            GitHub releases feed
            <input
              value={settings.updateFeedUrl}
              onChange={(event) => update("updateFeedUrl", event.target.value)}
              placeholder="https://api.github.com/repos/owner/repo/releases/latest"
            />
          </label>

          <label className="checkbox-row full-width">
            <input
              type="checkbox"
              checked={settings.autoCheckUpdates}
              onChange={(event) => update("autoCheckUpdates", event.target.checked)}
            />
            Check for updates on startup
          </label>
        </div>

        <div className="update-actions">
          <button
            className="button secondary"
            type="button"
            disabled={isCheckingUpdates}
            onClick={onCheckUpdates}
          >
            <RefreshCw
              className={isCheckingUpdates ? "spin" : ""}
              size={17}
              aria-hidden="true"
            />
            Check for Updates
          </button>
          <span className="update-status">{updateStatus}</span>
        </div>

        {updateResult && (
          <div
            className={`update-card ${
              updateResult.isUpdateAvailable ? "available" : "current"
            }`}
          >
            <strong>
              {updateResult.isUpdateAvailable
                ? `Version ${updateResult.latestVersion} is available`
                : "You are on the latest version"}
            </strong>
            <span>{updateResult.releaseName}</span>
            {updateResult.downloadUrl && (
              <a href={updateResult.downloadUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={15} aria-hidden="true" />
                Open release download
              </a>
            )}
          </div>
        )}
      </div>

      <div className="settings-saved">
        <Save size={17} aria-hidden="true" />
        Settings are saved on this computer.
      </div>
    </section>
  );
}
