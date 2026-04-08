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
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            rhythmPattern === rp.name
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-raised)] text-[var(--text-mid)] border border-[var(--border)] hover:border-[var(--border)]"
          }`}
        >
          {rp.label}
        </button>
      ))}
    </div>
  );
}
