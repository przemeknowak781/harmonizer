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
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            harmonyMode === m.value
              ? "bg-emerald-600 text-white"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
