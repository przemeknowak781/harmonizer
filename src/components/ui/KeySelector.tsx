import type { NoteName, ModeName } from "../../types/music";
import { NOTE_NAMES } from "../../engine/constants";

const MODES: { value: ModeName; label: string }[] = [
  { value: "major", label: "Major" },
  { value: "natural-minor", label: "Minor" },
  { value: "harmonic-minor", label: "Harmonic Minor" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "pentatonic", label: "Pentatonic" },
];

interface KeySelectorProps {
  root: NoteName;
  mode: ModeName;
  onRootChange: (root: NoteName) => void;
  onModeChange: (mode: ModeName) => void;
}

export function KeySelector({ root, mode, onRootChange, onModeChange }: KeySelectorProps) {
  return (
    <div className="flex gap-3 items-center">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-light)] uppercase tracking-wider">Key</span>
        <select
          value={root}
          onChange={(e) => onRootChange(e.target.value as NoteName)}
        >
          {NOTE_NAMES.map((note) => (
            <option key={note} value={note}>{note}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-light)] uppercase tracking-wider">Mode</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as ModeName)}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
