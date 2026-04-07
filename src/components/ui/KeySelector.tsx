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
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Key</span>
        <select
          value={root}
          onChange={(e) => onRootChange(e.target.value as NoteName)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-white"
        >
          {NOTE_NAMES.map((note) => (
            <option key={note} value={note}>{note}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Mode</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as ModeName)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-white"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
