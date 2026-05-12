import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { downloadPreset, uploadPresetFile } from "../../engine/preset-io";

interface PresetIOProps {
  /** Called after a successful import so the pipeline picks up new values. */
  onApply?: () => void;
}

export function PresetIO({ onApply }: PresetIOProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearRef.current) clearTimeout(clearRef.current);
    };
  }, []);

  function showStatus(kind: "ok" | "err", text: string, holdMs = 2500) {
    setStatus({ kind, text });
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => setStatus(null), holdMs);
  }

  function handleExport() {
    try {
      downloadPreset();
      showStatus("ok", "Exported");
    } catch (e) {
      showStatus("err", e instanceof Error ? e.message : "Export failed", 4000);
    }
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadPresetFile(file);
    if (result.ok) {
      showStatus("ok", "Imported");
      onApply?.();
    } else {
      showStatus("err", result.error, 4000);
    }
    // Reset so picking the same file again still triggers onChange
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={handleExport}
        className="pill pill-inactive inline-flex items-center gap-1"
        title="Download current settings as a .json file"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3 v12" />
          <path d="M7 10 l5 5 5 -5" />
          <path d="M4 20 h16" />
        </svg>
        Export
      </button>
      <button
        type="button"
        onClick={handleImportClick}
        className="pill pill-inactive inline-flex items-center gap-1"
        title="Load settings from a .json preset file"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21 v-12" />
          <path d="M7 14 l5 -5 5 5" />
          <path d="M4 4 h16" />
        </svg>
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        className="hidden"
      />
      {status && (
        <span
          className={`text-[10px] ml-1 ${
            status.kind === "ok" ? "text-[var(--green)]" : "text-[var(--red)]"
          }`}
        >
          {status.text}
        </span>
      )}
    </div>
  );
}
