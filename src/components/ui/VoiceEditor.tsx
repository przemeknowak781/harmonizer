import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

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
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {activeVoices.map(
          ({ index, volume, pan, octaveShift, cofSteps, cofOctaveReduce }) => (
            <div
              key={index}
              className="flex flex-col gap-2 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border-light)] min-w-36"
              style={{ boxShadow: "var(--shadow)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  {harmonyMode === "fifths"
                    ? `${cofSteps > 0 ? "+" : ""}${String(cofSteps)} 5th`
                    : `Voice ${String(index + 1)}`}
                </span>
                <button
                  onClick={() => {
                    removeVoice(index);
                    pipeline.current?.setVoiceVolume(index, 0);
                    syncVoicesToPipeline(pipeline);
                  }}
                  className="text-[var(--text-light)] hover:text-[var(--danger)] text-xs transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* CoF-specific: steps control */}
              {harmonyMode === "fifths" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setVoiceCofSteps(index, cofSteps - 1);
                      syncVoicesToPipeline(pipeline);
                    }}
                    className="w-6 h-6 rounded bg-[var(--surface-alt)] text-[var(--text-muted)] hover:bg-[var(--border-light)] text-xs transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xs text-[var(--text)] w-8 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {cofSteps > 0 ? "+" : ""}
                    {String(cofSteps)}
                  </span>
                  <button
                    onClick={() => {
                      setVoiceCofSteps(index, cofSteps + 1);
                      syncVoicesToPipeline(pipeline);
                    }}
                    className="w-6 h-6 rounded bg-[var(--surface-alt)] text-[var(--text-muted)] hover:bg-[var(--border-light)] text-xs transition-colors"
                  >
                    +
                  </button>
                  <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={cofOctaveReduce}
                      onChange={(e) => {
                        setVoiceCofOctaveReduce(index, e.target.checked);
                        syncVoicesToPipeline(pipeline);
                      }}
                    />
                    Oct
                  </label>
                </div>
              )}

              {/* Octave Shift — all modes */}
              <label className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-light)]">Octave</span>
                  <span className="text-xs text-[var(--text-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {octaveShift > 0 ? "+" : ""}{String(octaveShift)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={1}
                  value={octaveShift}
                  onChange={(e) => {
                    setVoiceOctaveShift(index, Number(e.target.value));
                    syncVoicesToPipeline(pipeline);
                  }}
                  className="w-full"
                />
              </label>

              {/* Volume */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-light)]">Vol</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVoiceVolume(index, v);
                    pipeline.current?.setVoiceVolume(index, v);
                  }}
                  className="w-full"
                />
              </label>

              {/* Pan */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-light)]">Pan</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={pan}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setVoicePan(index, p);
                    pipeline.current?.setVoicePan(index, p);
                  }}
                  className="w-full"
                />
              </label>
            </div>
          ),
        )}

        {/* Dry voice */}
        <div className="flex flex-col gap-2 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border-light)] min-w-36" style={{ boxShadow: "var(--shadow)" }}>
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Dry
          </span>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-light)]">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={dryVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDryVolume(v);
                pipeline.current?.setDryVolume(v);
              }}
              className="w-full"
            />
          </label>
        </div>
      </div>

      {/* Add Voice button */}
      {canAdd && (
        <button
          onClick={() => {
            addVoice();
            syncVoicesToPipeline(pipeline);
          }}
          className="self-start px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface)] text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          + Add Voice
        </button>
      )}
    </div>
  );
}
