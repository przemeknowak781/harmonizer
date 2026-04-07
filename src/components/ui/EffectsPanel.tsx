import type { MutableRefObject } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { AudioPipeline } from "../../audio/pipeline";

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
    <div className="flex flex-col gap-4">
      <h3 className="text-xs text-zinc-500 uppercase tracking-wider">
        Effects
      </h3>

      {/* Reverb */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 w-20">Reverb</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={reverbMix}
          onChange={(e) => updateReverb(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-xs text-zinc-500 w-10 text-right tabular-nums">
          {Math.round(reverbMix * 100)}%
        </span>
      </div>

      {/* Delay Time */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 w-20">Delay</span>
        <input
          type="range"
          min={0}
          max={2000}
          step={1}
          value={delayTime}
          onChange={(e) => updateDelayTime(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-xs text-zinc-500 w-10 text-right tabular-nums">
          {delayTime}ms
        </span>
      </div>

      {/* Delay Feedback */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 w-20">Feedback</span>
        <input
          type="range"
          min={0}
          max={0.9}
          step={0.01}
          value={delayFeedback}
          onChange={(e) => updateDelayFeedback(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-xs text-zinc-500 w-10 text-right tabular-nums">
          {Math.round(delayFeedback * 100)}%
        </span>
      </div>

      {/* Delay Mix */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 w-20">Delay Mix</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={delayMix}
          onChange={(e) => updateDelayMix(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-xs text-zinc-500 w-10 text-right tabular-nums">
          {Math.round(delayMix * 100)}%
        </span>
      </div>
    </div>
  );
}
