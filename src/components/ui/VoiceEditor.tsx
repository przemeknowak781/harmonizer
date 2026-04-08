import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface VoiceEditorProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

function syncVoicesToPipeline(pipeline: MutableRefObject<AudioPipeline | null>) {
  const states = useHarmonizerStore.getState().voiceStates;
  pipeline.current?.setCustomCofVoices(
    states.map((v) => ({
      steps: v.cofSteps,
      octaveReduce: v.cofOctaveReduce,
      volume: v.volume,
      pan: v.pan,
      active: v.active,
      octaveShift: v.octaveShift,
    })),
  );
}

export function VoiceEditor({ pipeline }: VoiceEditorProps) {
  const {
    voiceStates,
    harmonyMode,
    dryVolume,
    setVoiceVolume,
    setVoicePan,
    setVoiceOctaveShift,
    setVoiceCofSteps,
    setVoiceCofOctaveReduce,
    addVoice,
    removeVoice,
    setDryVolume,
  } = useHarmonizerStore();

  const activeVoices = voiceStates
    .map((v, i) => ({ ...v, index: i }))
    .filter((v) => v.active);
  const canAdd = activeVoices.length < 4;

  return (
    <div className="flex gap-px h-full">
      {activeVoices.map(
        ({ index, volume, pan, octaveShift, cofSteps, cofOctaveReduce }) => (
          <div
            key={index}
            className="flex flex-col items-center justify-between gap-0.5 py-1.5 px-2 bg-[var(--surface)] min-w-[60px]"
          >
            {/* Label + remove */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-[var(--text-mid)] uppercase tracking-wider">
                {harmonyMode === "fifths"
                  ? `${cofSteps > 0 ? "+" : ""}${String(cofSteps)}5`
                  : `V${String(index + 1)}`}
              </span>
              <button
                onClick={() => {
                  removeVoice(index);
                  pipeline.current?.setVoiceVolume(index, 0);
                  syncVoicesToPipeline(pipeline);
                }}
                className="text-[var(--text-dim)] hover:text-[var(--red)] text-[9px] transition-colors leading-none"
              >
                x
              </button>
            </div>

            {/* CoF steps control */}
            {harmonyMode === "fifths" && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => { setVoiceCofSteps(index, cofSteps - 1); syncVoicesToPipeline(pipeline); }}
                  className="w-4 h-4 rounded bg-[var(--surface-raised)] text-[var(--text-mid)] hover:bg-[var(--border)] text-[9px] transition-colors"
                >-</button>
                <span className="text-[9px] text-[var(--text)] w-5 text-center" style={mono}>
                  {cofSteps > 0 ? "+" : ""}{String(cofSteps)}
                </span>
                <button
                  onClick={() => { setVoiceCofSteps(index, cofSteps + 1); syncVoicesToPipeline(pipeline); }}
                  className="w-4 h-4 rounded bg-[var(--surface-raised)] text-[var(--text-mid)] hover:bg-[var(--border)] text-[9px] transition-colors"
                >+</button>
                <label className="flex items-center gap-0.5 text-[8px] text-[var(--text-mid)]">
                  <input
                    type="checkbox"
                    checked={cofOctaveReduce}
                    onChange={(e) => {
                      setVoiceCofOctaveReduce(index, e.target.checked);
                      syncVoicesToPipeline(pipeline);
                    }}
                  />
                  O
                </label>
              </div>
            )}

            {/* Volume — horizontal mini slider */}
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVoiceVolume(index, v);
                pipeline.current?.setVoiceVolume(index, v);
              }}
              className="w-full" />

            {/* Pan */}
            <input type="range" min={-1} max={1} step={0.01} value={pan}
              onChange={(e) => {
                const p = Number(e.target.value);
                setVoicePan(index, p);
                pipeline.current?.setVoicePan(index, p);
              }}
              className="w-full" />

            {/* Octave shift */}
            <span className="text-[9px] text-[var(--amber)]" style={mono}>
              {octaveShift > 0 ? "+" : ""}{String(octaveShift)}
            </span>
            <input type="range" min={-2} max={2} step={1} value={octaveShift}
              onChange={(e) => {
                setVoiceOctaveShift(index, Number(e.target.value));
                syncVoicesToPipeline(pipeline);
              }}
              className="w-full" />
          </div>
        ),
      )}

      {/* Dry voice strip */}
      <div className="flex flex-col items-center justify-between gap-0.5 py-1.5 px-2 bg-[var(--surface)] min-w-[60px]">
        <span className="text-[9px] font-bold text-[var(--text-mid)] uppercase tracking-wider">Dry</span>
        <input type="range" min={0} max={1} step={0.01} value={dryVolume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDryVolume(v);
            pipeline.current?.setDryVolume(v);
          }}
          className="w-full" />
        <span className="text-[9px] text-[var(--text-dim)]" style={mono}>{Math.round(dryVolume * 100)}</span>
      </div>

      {/* Add voice */}
      {canAdd && (
        <button
          onClick={() => { addVoice(); syncVoicesToPipeline(pipeline); }}
          className="flex items-center justify-center px-2 bg-[var(--surface)] text-[var(--text-dim)] hover:text-[var(--amber)] text-lg transition-colors min-w-[40px]"
        >
          +
        </button>
      )}
    </div>
  );
}
