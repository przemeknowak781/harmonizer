import type { HarmonyPresetName } from "../../types/music";
import { PRESETS } from "../../engine/presets";

interface PresetSelectorProps {
  value: HarmonyPresetName;
  onChange: (preset: HarmonyPresetName) => void;
}

const PRESET_LIST = Object.values(PRESETS);

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRESET_LIST.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onChange(preset.name)}
          className={`pill ${value === preset.name ? "pill-active" : "pill-inactive"}`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
