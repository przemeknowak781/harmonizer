import type { MutableRefObject } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface EffectsPanelProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

export function EffectsPanel({ pipeline }: EffectsPanelProps) {
  const {
    reverbMix,
    delayTime,
    delayFeedback,
    delayMix,
    setReverbMix,
    setDelayTime,
    setDelayFeedback,
    setDelayMix,
  } = useHarmonizerStore();

  function updateReverb(v: number) {
    setReverbMix(v);
    pipeline.current?.setReverbMix(v);
  }

  function updateDelayTime(v: number) {
    setDelayTime(v);
    pipeline.current?.setDelayTime(v);
  }

  function updateDelayFeedback(v: number) {
    setDelayFeedback(v);
    pipeline.current?.setDelayFeedback(v);
  }

  function updateDelayMix(v: number) {
    setDelayMix(v);
    pipeline.current?.setDelayMix(v);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-mid)] w-16">Reverb</span>
        <input type="range" min={0} max={1} step={0.01} value={reverbMix}
          onChange={(e) => updateReverb(Number(e.target.value))} className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-10 text-right" style={mono}>
          {Math.round(reverbMix * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-mid)] w-16">Delay</span>
        <input type="range" min={0} max={2000} step={1} value={delayTime}
          onChange={(e) => updateDelayTime(Number(e.target.value))} className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-10 text-right" style={mono}>
          {delayTime}ms
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-mid)] w-16">Feedback</span>
        <input type="range" min={0} max={0.9} step={0.01} value={delayFeedback}
          onChange={(e) => updateDelayFeedback(Number(e.target.value))} className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-10 text-right" style={mono}>
          {Math.round(delayFeedback * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-mid)] w-16">Delay Mix</span>
        <input type="range" min={0} max={1} step={0.01} value={delayMix}
          onChange={(e) => updateDelayMix(Number(e.target.value))} className="flex-1" />
        <span className="text-[10px] text-[var(--text-dim)] w-10 text-right" style={mono}>
          {Math.round(delayMix * 100)}%
        </span>
      </div>
    </div>
  );
}
