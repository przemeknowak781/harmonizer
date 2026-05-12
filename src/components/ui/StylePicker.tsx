import { STYLES, applyStyle, type Style } from "../../engine/styles";

interface StylePickerProps {
  /** Called after the style is applied so the pipeline picks up new values. */
  onApply?: () => void;
}

export function StylePicker({ onApply }: StylePickerProps) {
  function handlePick(style: Style) {
    applyStyle(style);
    onApply?.();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => handlePick(s)}
            title={s.description}
            className="pill pill-inactive hover:!border-[var(--amber)] hover:!text-[var(--amber)] transition-all"
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
        One-tap recipe — sets mode, key, voicing, effects and smoothing.
      </p>
    </div>
  );
}
