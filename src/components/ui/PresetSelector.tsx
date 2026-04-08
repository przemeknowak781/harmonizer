import type { HarmonyPresetName } from "../../types/music";
import { PRESETS } from "../../engine/presets";

interface PresetSelectorProps {
  value: HarmonyPresetName;
  onChange: (preset: HarmonyPresetName) => void;
}

const PRESET_LIST = Object.values(PRESETS);

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESET_LIST.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onChange(preset.name)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            value === preset.name
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-raised)] text-[var(--text-mid)] border border-[var(--border)] hover:border-[var(--border)]"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
