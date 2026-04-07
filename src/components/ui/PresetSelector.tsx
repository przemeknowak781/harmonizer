import type { HarmonyPresetName } from "../../types/music";
import { PRESETS } from "../../engine/presets";

interface PresetSelectorProps {
  value: HarmonyPresetName;
  onChange: (preset: HarmonyPresetName) => void;
}

const PRESET_LIST = Object.values(PRESETS);

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <div className="flex gap-2">
      {PRESET_LIST.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onChange(preset.name)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === preset.name
              ? "bg-emerald-600 text-white"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
