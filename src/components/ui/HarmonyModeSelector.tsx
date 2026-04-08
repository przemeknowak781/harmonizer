import { useHarmonizerStore } from "../../stores/harmonizer-store";

const MODES: {
  value: "interval" | "chord" | "fifths" | "geometric";
  label: string;
}[] = [
  { value: "interval", label: "Interval" },
  { value: "chord", label: "Chord" },
  { value: "fifths", label: "Circle of 5ths" },
  { value: "geometric", label: "Geometric JI" },
];

export function HarmonyModeSelector() {
  const { harmonyMode, setHarmonyMode } = useHarmonizerStore();

  return (
    <div className="flex gap-2">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => setHarmonyMode(m.value)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            harmonyMode === m.value
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-raised)] text-[var(--text-mid)] border border-[var(--border)] hover:border-[var(--border)]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
