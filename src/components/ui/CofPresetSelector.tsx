import { COF_PRESETS } from "../../engine/circle-of-fifths";
import { useHarmonizerStore } from "../../stores/harmonizer-store";

export function CofPresetSelector() {
  const { cofPresetName, setCofPreset } = useHarmonizerStore();
  return (
    <div className="flex flex-wrap gap-1.5">
      {COF_PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={() => setCofPreset(preset.name)}
          className={`pill ${cofPresetName === preset.name ? "pill-active" : "pill-inactive"}`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
