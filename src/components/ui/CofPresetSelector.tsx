import { COF_PRESETS } from "../../engine/circle-of-fifths";
import { useHarmonizerStore } from "../../stores/harmonizer-store";

export function CofPresetSelector() {
  const { cofPresetName, setCofPreset } = useHarmonizerStore();
  return (
    <div className="flex flex-wrap gap-2">
      {COF_PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={() => setCofPreset(preset.name)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            cofPresetName === preset.name
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border-light)] hover:border-[var(--border)]"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
