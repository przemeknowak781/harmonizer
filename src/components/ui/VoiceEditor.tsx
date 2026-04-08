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

const OCT_VALUES = [-2, -1, 0, 1, 2] as const;

export function VoiceEditor({ pipeline }: VoiceEditorProps) {
  const {
    voiceStates, harmonyMode, dryVolume,
    setVoiceVolume, setVoicePan, setVoiceOctaveShift,
    setVoiceCofSteps, setVoiceCofOctaveReduce,
    addVoice, removeVoice, setDryVolume,
  } = useHarmonizerStore();

  const activeVoices = voiceStates
    .map((v, i) => ({ ...v, index: i }))
    .filter((v) => v.active);
  const canAdd = activeVoices.length < 4;

  return (
    <div className="flex flex-col gap-2">
      {/* ── Voice rows ── */}
      {activeVoices.map(({ index, volume, pan, octaveShift, cofSteps, cofOctaveReduce }) => (
        <div key={index} className="flex flex-col gap-1 bg-[var(--surface-raised)] rounded-lg p-2">
          {/* Header: label + octave buttons + remove */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[var(--amber)] w-6" style={mono}>
              {harmonyMode === "fifths"
                ? `${cofSteps > 0 ? "+" : ""}${String(cofSteps)}`
                : `V${String(index + 1)}`}
            </span>

            {/* Octave: discrete buttons */}
            <div className="flex gap-px flex-1">
              {OCT_VALUES.map((oct) => (
                <button key={oct}
                  onClick={() => { setVoiceOctaveShift(index, oct); syncVoicesToPipeline(pipeline); }}
                  className={`flex-1 h-4 text-[8px] font-bold rounded-sm transition-all ${
                    octaveShift === oct
                      ? "bg-[var(--amber)] text-black shadow-[0_0_6px_var(--amber-glow)]"
                      : "bg-[var(--border)] text-[var(--text-dim)] hover:bg-[var(--border-light)] hover:text-[var(--text-mid)]"
                  }`} style={mono}>
                  {oct > 0 ? `+${oct}` : String(oct)}
                </button>
              ))}
            </div>

            <button
              onClick={() => { removeVoice(index); pipeline.current?.setVoiceVolume(index, 0); syncVoicesToPipeline(pipeline); }}
              className="text-[var(--text-dim)] hover:text-[var(--red)] text-[9px] transition-colors w-3 text-center">
              ✕
            </button>
          </div>

          {/* CoF: steps control */}
          {harmonyMode === "fifths" && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-[var(--text-dim)] w-6">5ths</span>
              <button onClick={() => { setVoiceCofSteps(index, cofSteps - 1); syncVoicesToPipeline(pipeline); }}
                className="w-4 h-4 rounded bg-[var(--border)] text-[var(--text-mid)] hover:bg-[var(--amber)] hover:text-black text-[9px] transition-colors">−</button>
              <span className="text-[9px] text-[var(--text)] w-6 text-center" style={mono}>
                {cofSteps > 0 ? "+" : ""}{String(cofSteps)}
              </span>
              <button onClick={() => { setVoiceCofSteps(index, cofSteps + 1); syncVoicesToPipeline(pipeline); }}
                className="w-4 h-4 rounded bg-[var(--border)] text-[var(--text-mid)] hover:bg-[var(--amber)] hover:text-black text-[9px] transition-colors">+</button>
              <label className="flex items-center gap-0.5 text-[8px] text-[var(--text-mid)] ml-auto">
                <input type="checkbox" checked={cofOctaveReduce}
                  onChange={(e) => { setVoiceCofOctaveReduce(index, e.target.checked); syncVoicesToPipeline(pipeline); }} />
                Oct
              </label>
            </div>
          )}

          {/* Vol + Pan sliders */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-[var(--text-dim)] w-6">vol</span>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => { const v = Number(e.target.value); setVoiceVolume(index, v); pipeline.current?.setVoiceVolume(index, v); }}
              className="flex-1" />
            <span className="text-[8px] text-[var(--text-dim)] w-5 text-right" style={mono}>{Math.round(volume * 100)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-[var(--text-dim)] w-6">pan</span>
            <input type="range" min={-1} max={1} step={0.01} value={pan}
              onChange={(e) => { const p = Number(e.target.value); setVoicePan(index, p); pipeline.current?.setVoicePan(index, p); }}
              className="flex-1" />
            <span className="text-[8px] text-[var(--text-dim)] w-5 text-right" style={mono}>
              {pan === 0 ? "C" : pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`}
            </span>
          </div>
        </div>
      ))}

      {/* ── Dry ── */}
      <div className="flex items-center gap-1 bg-[var(--surface-raised)] rounded-lg p-2">
        <span className="text-[10px] font-bold text-[var(--text-mid)] w-6" style={mono}>Dry</span>
        <input type="range" min={0} max={1} step={0.01} value={dryVolume}
          onChange={(e) => { const v = Number(e.target.value); setDryVolume(v); pipeline.current?.setDryVolume(v); }}
          className="flex-1" />
        <span className="text-[8px] text-[var(--text-dim)] w-5 text-right" style={mono}>{Math.round(dryVolume * 100)}</span>
      </div>

      {/* ── Add ── */}
      {canAdd && (
        <button onClick={() => { addVoice(); syncVoicesToPipeline(pipeline); }}
          className="w-full py-1 rounded-lg text-[10px] font-medium bg-transparent text-[var(--text-dim)] border border-dashed border-[var(--border)] hover:border-[var(--amber)] hover:text-[var(--amber)] transition-all">
          + Add Voice
        </button>
      )}
    </div>
  );
}
