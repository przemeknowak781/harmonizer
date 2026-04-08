import type { NoteName, ModeName } from "../../types/music";
import { NOTE_NAMES } from "../../engine/constants";

const MODES: { value: ModeName; label: string }[] = [
  { value: "major", label: "Maj" },
  { value: "natural-minor", label: "Min" },
  { value: "harmonic-minor", label: "Harm" },
  { value: "dorian", label: "Dor" },
  { value: "mixolydian", label: "Mix" },
  { value: "pentatonic", label: "Pent" },
];

interface KeySelectorProps {
  root: NoteName;
  mode: ModeName;
  onRootChange: (root: NoteName) => void;
  onModeChange: (mode: ModeName) => void;
}

export function KeySelector({ root, mode, onRootChange, onModeChange }: KeySelectorProps) {
  return (
    <div className="flex gap-1.5 items-center">
      <select
        value={root}
        onChange={(e) => onRootChange(e.target.value as NoteName)}
        className="text-[11px]"
      >
        {NOTE_NAMES.map((note) => (
          <option key={note} value={note}>{note}</option>
        ))}
      </select>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as ModeName)}
        className="text-[11px]"
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
