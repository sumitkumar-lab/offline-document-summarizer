import { Cpu, Save } from "lucide-react";
import type { AppSettings, Runtime } from "../types";

interface SettingsPageProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export function SettingsPage({ settings, onChange }: SettingsPageProps) {
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

      <div className="settings-saved">
        <Save size={17} aria-hidden="true" />
        Settings are saved on this computer.
      </div>
    </section>
  );
}

