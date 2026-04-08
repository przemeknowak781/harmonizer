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
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border-light)] hover:border-[var(--border)]"
          }`}
        >
          {rp.label}
        </button>
      ))}
    </div>
  );
}
