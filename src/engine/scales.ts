import type { NoteName, ModeName } from "../types/music";
import { NOTE_NAMES, SCALE_INTERVALS, SEMITONES_PER_OCTAVE } from "./constants";

export function getScaleNotes(root: NoteName, mode: ModeName): number[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const intervals = SCALE_INTERVALS[mode];
  return intervals.map((semitone) => (rootIndex + semitone) % SEMITONES_PER_OCTAVE);
}

export function snapToScale(midi: number, root: NoteName, mode: ModeName): number {
  const scaleNotes = getScaleNotes(root, mode);
  const pitchClass = ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  const octaveBase = midi - pitchClass;

  let bestDistance = Infinity;
  let bestMidi = midi;

  for (const note of scaleNotes) {
    for (const offset of [-SEMITONES_PER_OCTAVE, 0, SEMITONES_PER_OCTAVE]) {
      const candidate = octaveBase + note + offset;
      const distance = Math.abs(candidate - midi);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMidi = candidate;
      }
    }
  }

  return bestMidi;
}

export function getScaleDegree(midi: number, root: NoteName, mode: ModeName): number {
  const snapped = snapToScale(midi, root, mode);
  const scaleNotes = getScaleNotes(root, mode);
  const pitchClass = ((snapped % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  return scaleNotes.indexOf(pitchClass);
}
