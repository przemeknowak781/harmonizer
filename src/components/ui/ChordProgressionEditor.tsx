import { useHarmonizerStore } from "../../stores/harmonizer-store";
import {
  COMMON_PROGRESSIONS,
  buildProgression,
} from "../../engine/progressions";
import type { Chord, ChordQuality } from "../../types/chords";

const QUALITY_SUFFIXES: Record<ChordQuality, string> = {
  major: "",
  minor: "m",
  dim: "dim",
  aug: "aug",
  dom7: "7",
  maj7: "maj7",
  min7: "m7",
  dim7: "dim7",
  sus2: "sus2",
  sus4: "sus4",
};

function formatChordName(chord: Chord): string {
  return chord.root + QUALITY_SUFFIXES[chord.quality];
}

export function ChordProgressionEditor() {
  const { key, activeProgression, currentBeat, setActiveProgression } =
    useHarmonizerStore();

  const totalBeats = activeProgression
    ? activeProgression.slots.reduce((sum, s) => sum + s.beats, 0)
    : 0;
  const wrappedBeat =
    totalBeats > 0
      ? ((Math.floor(currentBeat) % totalBeats) + totalBeats) % totalBeats
      : 0;

  let currentSlotIndex = -1;
  if (activeProgression) {
    let acc = 0;
    for (let i = 0; i < activeProgression.slots.length; i++) {
      const slot = activeProgression.slots[i];
      if (!slot) continue;
      acc += slot.beats;
      if (wrappedBeat < acc) {
        currentSlotIndex = i;
        break;
      }
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = Number(e.target.value);
    const template = COMMON_PROGRESSIONS[idx];
    if (!template) return;
    const prog = buildProgression(key.root, key.mode, template.degrees, 4);
    prog.name = template.name;
    setActiveProgression(prog);
  }

  const selectedIndex = activeProgression
    ? COMMON_PROGRESSIONS.findIndex(
        (t) => t.name === activeProgression.name,
      )
    : -1;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <select
          value={selectedIndex >= 0 ? selectedIndex : ""}
          onChange={handleSelect}
        >
          <option value="" disabled>
            Select a progression...
          </option>
          {COMMON_PROGRESSIONS.map((t, i) => (
            <option key={t.name} value={i}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {activeProgression && (
        <div className="flex gap-1.5 flex-wrap">
          {activeProgression.slots.map((slot, i) => (
            <div
              key={i}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                i === currentSlotIndex
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {formatChordName(slot.chord)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
