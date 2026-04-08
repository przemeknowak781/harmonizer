import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

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
    <div className="flex flex-col gap-3">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">Smoothing</span>

      {/* Fade toggle + slider */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 min-w-24">
          <input
            type="checkbox"
            checked={smoothFadeEnabled}
            onChange={(e) => {
              setSmoothFadeEnabled(e.target.checked);
              syncSmoothToPipeline(pipeline);
            }}
            className="accent-emerald-500"
          />
          <span className="text-xs text-zinc-400">Fade</span>
        </label>
        <input
          type="range"
          min={10}
          max={300}
          step={10}
          value={fadeTimeMs}
          disabled={!smoothFadeEnabled}
          onChange={(e) => {
            setFadeTimeMs(Number(e.target.value));
            syncSmoothToPipeline(pipeline);
          }}
          className="flex-1 accent-emerald-500 disabled:opacity-30"
        />
        <span className="text-xs text-zinc-500 w-14 text-right">
          {String(fadeTimeMs)} ms
        </span>
      </div>

      {/* Portamento toggle + slider */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 min-w-24">
          <input
            type="checkbox"
            checked={portamentoEnabled}
            onChange={(e) => {
              setPortamentoEnabled(e.target.checked);
              syncSmoothToPipeline(pipeline);
            }}
            className="accent-violet-500"
          />
          <span className="text-xs text-zinc-400">Legato</span>
        </label>
        <input
          type="range"
          min={10}
          max={200}
          step={5}
          value={portamentoTimeMs}
          disabled={!portamentoEnabled}
          onChange={(e) => {
            setPortamentoTimeMs(Number(e.target.value));
            syncSmoothToPipeline(pipeline);
          }}
          className="flex-1 accent-violet-500 disabled:opacity-30"
        />
        <span className="text-xs text-zinc-500 w-14 text-right">
          {String(portamentoTimeMs)} ms
        </span>
      </div>

      {/* Jitter gate slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400 min-w-24">Jitter Gate</span>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={jitterGateCents}
          disabled={!portamentoEnabled}
          onChange={(e) => {
            setJitterGateCents(Number(e.target.value));
            syncSmoothToPipeline(pipeline);
          }}
          className="flex-1 accent-violet-500 disabled:opacity-30"
        />
        <span className="text-xs text-zinc-500 w-14 text-right">
          {String(jitterGateCents)} &cent;
        </span>
      </div>
    </div>
  );
}
