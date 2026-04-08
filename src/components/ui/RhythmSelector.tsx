import { useHarmonizerStore } from "../../stores/harmonizer-store";
import { RHYTHM_PATTERNS } from "../../engine/rhythm";

export function RhythmSelector() {
  const { rhythmPattern, setRhythmPattern } = useHarmonizerStore();

  return (
    <div className="flex gap-1.5 flex-wrap">
      {RHYTHM_PATTERNS.map((rp) => (
        <button
          key={rp.name}
          onClick={() => setRhythmPattern(rp.name)}
          className={`pill ${rhythmPattern === rp.name ? "pill-active" : "pill-inactive"}`}
        >
          {rp.label}
        </button>
      ))}
    </div>
  );
}
