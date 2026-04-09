import { useState } from "react";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface OrchestraPanelProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

const SECTIONS = [
  { key: "violin1", label: "Violin I", emoji: "🎻" },
  { key: "violin2", label: "Violin II", emoji: "🎻" },
  { key: "viola", label: "Viola", emoji: "🎻" },
  { key: "cello", label: "Cello", emoji: "🎻" },
  { key: "contrabass", label: "Bass", emoji: "🎸" },
] as const;

export function OrchestraPanel({ pipeline }: OrchestraPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [volume, setVolume] = useState(50);
  const [sectionState, setSectionState] = useState<Record<string, boolean>>({
    violin1: true, violin2: true, viola: true, cello: true, contrabass: true,
  });

  async function handleEnable(checked: boolean) {
    const p = pipeline.current;
    if (!p) return;

    if (checked && !loaded) {
      // First enable → load samples
      setLoading(true);
      try {
        await p.loadOrchestra();
        setLoaded(true);
      } catch (e) {
        console.warn("Failed to load orchestra:", e);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setEnabled(checked);
    p.setOrchestraEnabled(checked);
  }

  function handleVolume(v: number) {
    setVolume(v);
    pipeline.current?.setOrchestraVolume(v / 100);
  }

  function handleSection(key: string, e: boolean) {
    setSectionState(prev => ({ ...prev, [key]: e }));
    pipeline.current?.setOrchestraSectionEnabled(key, e);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Enable toggle */}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} disabled={loading}
          onChange={(e) => handleEnable(e.target.checked)} />
        <span className="text-[10px] font-bold text-[var(--text-mid)] uppercase tracking-wider">
          Orchestra
        </span>
        {loading && (
          <span className="text-[8px] text-[var(--amber)] animate-pulse ml-auto" style={mono}>
            Loading samples...
          </span>
        )}
        {enabled && loaded && (
          <span className="text-[8px] text-[var(--green)] ml-auto" style={mono}>ON</span>
        )}
      </div>

      {enabled && loaded && (
        <>
          {/* Volume */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text-dim)] w-8">Vol</span>
            <input type="range" min={0} max={100} step={1} value={volume}
              onChange={(e) => handleVolume(Number(e.target.value))}
              className="flex-1" />
            <span className="text-[9px] text-[var(--text-dim)] w-5 text-right" style={mono}>
              {volume}
            </span>
          </div>

          {/* Section toggles */}
          <div className="flex flex-wrap gap-1">
            {SECTIONS.map(({ key, label }) => (
              <button key={key}
                onClick={() => handleSection(key, !sectionState[key])}
                className={`pill ${sectionState[key] ? "pill-active" : "pill-inactive"}`}
                style={{ fontSize: "9px", padding: "2px 8px" }}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
