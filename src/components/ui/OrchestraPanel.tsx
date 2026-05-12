import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";
import { useHarmonizerStore } from "../../stores/harmonizer-store";

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

/**
 * Orchestra controls.
 *
 * `enabled`, `volume` and `activePattern` live in the global store so they
 * persist across panel re-mounts (mobile tab switches), pipeline restarts,
 * and so the app can launch with a pre-configured default (orchestra on,
 * Tremolo pattern, 0.72 volume). `loaded` and `loading` stay local since
 * they're transient pipeline-derived state.
 *
 * On mic START, `useAudio` consults the store and async-loads the orchestra
 * if it's enabled — so the user gets immediate mic feedback while samples
 * stream in. This panel resyncs `loaded` from the pipeline whenever
 * isListening flips, so the UI shows the correct "Loading..." / "ON" badge.
 */
export function OrchestraPanel({ pipeline }: OrchestraPanelProps) {
  const isListening = useHarmonizerStore((s) => s.isListening);
  const enabled = useHarmonizerStore((s) => s.orchestraEnabled);
  const volume = useHarmonizerStore((s) => s.orchestraVolume);
  const activePattern = useHarmonizerStore((s) => s.orchestraPattern);
  const setEnabled = useHarmonizerStore((s) => s.setOrchestraEnabled);
  const setVolume = useHarmonizerStore((s) => s.setOrchestraVolume);
  const setActivePattern = useHarmonizerStore((s) => s.setOrchestraPattern);

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = pipeline.current;
    if (isListening && p) {
      setLoaded(p.isOrchestraLoaded());
      setLoading(!p.isOrchestraLoaded() && enabled);
    } else {
      setLoaded(false);
      setLoading(false);
    }
  }, [isListening, pipeline, enabled]);

  // Poll briefly while we expect samples to be loading, so the badge flips
  // from "Loading..." to "ON" as soon as the pipeline reports loaded.
  useEffect(() => {
    if (!loading) return;
    const p = pipeline.current;
    if (!p) return;
    const id = setInterval(() => {
      if (p.isOrchestraLoaded()) {
        setLoaded(true);
        setLoading(false);
      }
    }, 200);
    return () => clearInterval(id);
  }, [loading, pipeline]);

  async function handleEnable(checked: boolean) {
    setEnabled(checked);
    const p = pipeline.current;
    if (!p) return;

    if (checked && !p.isOrchestraLoaded()) {
      setLoading(true);
      try {
        await p.loadOrchestra();
      } catch (e) {
        console.warn("Failed to load orchestra:", e);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setLoaded(p.isOrchestraLoaded());
    p.setOrchestraEnabled(checked);
    p.setOrchestraVolume(volume);
    p.setOrchestraPattern(activePattern);
  }

  function handleVolume(v: number) {
    setVolume(v);
    pipeline.current?.setOrchestraVolume(v);
  }

  function handlePattern(key: string) {
    setActivePattern(key);
    pipeline.current?.setOrchestraPattern(key);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} disabled={loading || !isListening}
          onChange={(e) => handleEnable(e.target.checked)} />
        <span className="text-[10px] font-bold text-[var(--text-mid)] uppercase tracking-wider">
          Orchestra
        </span>
        {loading && (
          <span className="text-[8px] text-[var(--amber)] animate-pulse ml-auto" style={mono}>
            Loading...
          </span>
        )}
        {enabled && loaded && !loading && (
          <span className="text-[8px] text-[var(--green)] ml-auto" style={mono}>ON</span>
        )}
        {!isListening && (
          <span className="text-[8px] text-[var(--text-dim)] ml-auto" style={mono}>start mic</span>
        )}
      </div>

      {enabled && loaded && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text-dim)] w-8">Vol</span>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => handleVolume(Number(e.target.value))}
              className="flex-1" />
            <span className="text-[9px] text-[var(--text-dim)] w-5 text-right" style={mono}>
              {Math.round(volume * 100)}
            </span>
          </div>

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
