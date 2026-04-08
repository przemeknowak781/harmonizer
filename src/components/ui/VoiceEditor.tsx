import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

interface VoiceEditorProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

export function VoiceEditor({ pipeline }: VoiceEditorProps) {
  const {
    voiceStates,
    harmonyMode,
    dryVolume,
    setVoiceVolume,
    setVoicePan,
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
          ({ index, volume, pan, cofSteps, cofOctaveReduce }) => (
            <div
              key={index}
              className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 min-w-36"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  {harmonyMode === "fifths"
                    ? `${cofSteps > 0 ? "+" : ""}${String(cofSteps)} 5th`
                    : `Voice ${String(index + 1)}`}
                </span>
                <button
                  onClick={() => {
                    removeVoice(index);
                    pipeline.current?.setVoiceVolume(index, 0);
                  }}
                  className="text-zinc-600 hover:text-red-400 text-xs"
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
                    }}
                    className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs text-zinc-300 w-8 text-center">
                    {cofSteps > 0 ? "+" : ""}
                    {String(cofSteps)}
                  </span>
                  <button
                    onClick={() => {
                      setVoiceCofSteps(index, cofSteps + 1);
                    }}
                    className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs"
                  >
                    +
                  </button>
                  <label className="flex items-center gap-1 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={cofOctaveReduce}
                      onChange={(e) =>
                        setVoiceCofOctaveReduce(index, e.target.checked)
                      }
                      className="accent-amber-500"
                    />
                    Oct
                  </label>
                </div>
              )}

              {/* Volume */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Vol</span>
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
                  className="w-full accent-emerald-500"
                />
              </label>

              {/* Pan */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Pan</span>
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
                  className="w-full accent-emerald-500"
                />
              </label>
            </div>
          ),
        )}

        {/* Dry voice */}
        <div className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 min-w-36">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Dry
          </span>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Vol</span>
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
              className="w-full accent-emerald-500"
            />
          </label>
        </div>
      </div>

      {/* Add Voice button */}
      {canAdd && (
        <button
          onClick={addVoice}
          className="self-start px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 border-dashed hover:border-emerald-600 hover:text-emerald-400 transition-colors"
        >
          + Add Voice
        </button>
      )}
    </div>
  );
}
