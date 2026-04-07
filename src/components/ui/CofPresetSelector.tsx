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
              ? "bg-amber-600 text-white"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
