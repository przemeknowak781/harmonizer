import { useHarmonizerStore } from "../../stores/harmonizer-store";
import { RHYTHM_PATTERNS } from "../../engine/rhythm";

export function RhythmSelector() {
  const { rhythmPattern, setRhythmPattern } = useHarmonizerStore();

  return (
    <div className="flex gap-2 flex-wrap">
      {RHYTHM_PATTERNS.map((rp) => (
        <button
          key={rp.name}
          onClick={() => setRhythmPattern(rp.name)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            rhythmPattern === rp.name
              ? "bg-emerald-600 text-white"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          {rp.label}
        </button>
      ))}
    </div>
  );
}
