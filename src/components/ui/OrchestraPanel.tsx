import { useState } from "react";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface OrchestraPanelProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

const PATTERNS = [
  { key: "cinematic",      label: "Cinematic" },
  { key: "sustained",      label: "Chorale" },
  { key: "arpeggiated",    label: "Arpeggio" },
  { key: "tremolo-drama",  label: "Tremolo" },
  { key: "pizz-pulse",     label: "Pizzicato" },
] as const;

export function OrchestraPanel({ pipeline }: OrchestraPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [volume, setVolume] = useState(50);
  const [activePattern, setActivePattern] = useState("cinematic");

  async function handleEnable(checked: boolean) {
    const p = pipeline.current;
    if (!p) return;

    if (checked && !loaded) {
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

  function handlePattern(key: string) {
    setActivePattern(key);
    pipeline.current?.setOrchestraPattern(key);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} disabled={loading}
          onChange={(e) => handleEnable(e.target.checked)} />
        <span className="text-[10px] font-bold text-[var(--text-mid)] uppercase tracking-wider">
          Orchestra
        </span>
        {loading && (
          <span className="text-[8px] text-[var(--amber)] animate-pulse ml-auto" style={mono}>
            Loading...
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
            <span className="text-[9px] text-[var(--text-dim)] w-5 text-right" style={mono}>{volume}</span>
          </div>

          {/* Pattern selector */}
          <div className="flex flex-wrap gap-1">
            {PATTERNS.map(({ key, label }) => (
              <button key={key}
                onClick={() => handlePattern(key)}
                className={`pill ${activePattern === key ? "pill-active" : "pill-inactive"}`}
                style={{ fontSize: "8px", padding: "2px 6px" }}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
