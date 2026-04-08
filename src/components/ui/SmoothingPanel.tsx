import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface SmoothingPanelProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

function syncSmoothToPipeline(pipeline: MutableRefObject<AudioPipeline | null>) {
  const s = useHarmonizerStore.getState();
  pipeline.current?.setSmoothConfig({
    fadeEnabled: s.smoothFadeEnabled,
    fadeMs: s.fadeTimeMs,
    portamentoEnabled: s.portamentoEnabled,
    portamentoMs: s.portamentoTimeMs,
    jitterCents: s.jitterGateCents,
  });
}

export function SmoothingPanel({ pipeline }: SmoothingPanelProps) {
  const {
    smoothFadeEnabled,
    fadeTimeMs,
    portamentoEnabled,
    portamentoTimeMs,
    jitterGateCents,
    setSmoothFadeEnabled,
    setFadeTimeMs,
    setPortamentoEnabled,
    setPortamentoTimeMs,
    setJitterGateCents,
  } = useHarmonizerStore();

  return (
    <div className="flex flex-col gap-1.5">
      {/* Fade toggle + slider */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 w-16">
          <input
            type="checkbox"
            checked={smoothFadeEnabled}
            onChange={(e) => {
              setSmoothFadeEnabled(e.target.checked);
              syncSmoothToPipeline(pipeline);
            }}
          />
          <span className="text-[10px] text-[var(--text-mid)]">Fade</span>
        </label>
        <input type="range" min={10} max={300} step={10} value={fadeTimeMs}
          disabled={!smoothFadeEnabled}
          onChange={(e) => {
            setFadeTimeMs(Number(e.target.value));
            syncSmoothToPipeline(pipeline);
          }}
          className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-12 text-right" style={mono}>
          {String(fadeTimeMs)} ms
        </span>
      </div>

      {/* Portamento toggle + slider */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 w-16">
          <input
            type="checkbox"
            checked={portamentoEnabled}
            onChange={(e) => {
              setPortamentoEnabled(e.target.checked);
              syncSmoothToPipeline(pipeline);
            }}
          />
          <span className="text-[10px] text-[var(--text-mid)]">Legato</span>
        </label>
        <input type="range" min={10} max={200} step={5} value={portamentoTimeMs}
          disabled={!portamentoEnabled}
          onChange={(e) => {
            setPortamentoTimeMs(Number(e.target.value));
            syncSmoothToPipeline(pipeline);
          }}
          className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-12 text-right" style={mono}>
          {String(portamentoTimeMs)} ms
        </span>
      </div>

      {/* Jitter gate slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-mid)] w-16">Jitter</span>
        <input type="range" min={0} max={50} step={1} value={jitterGateCents}
          disabled={!portamentoEnabled}
          onChange={(e) => {
            setJitterGateCents(Number(e.target.value));
            syncSmoothToPipeline(pipeline);
          }}
          className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-12 text-right" style={mono}>
          {String(jitterGateCents)} &cent;
        </span>
      </div>
    </div>
  );
}
