import type { NoteName } from "../types/music";
import { NOTE_NAMES, A4_FREQUENCY, A4_MIDI, SEMITONES_PER_OCTAVE } from "./constants";

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function frequencyToMidi(frequency: number): number {
  return A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY);
}

export function midiToNoteName(midi: number): NoteName {
  const index = ((Math.round(midi) % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  return NOTE_NAMES[index]!;
}

export function midiToOctave(midi: number): number {
  return Math.floor(Math.round(midi) / SEMITONES_PER_OCTAVE) - 1;
}

export function frequencyToCents(frequency: number): number {
  const midi = frequencyToMidi(frequency);
  const nearestMidi = Math.round(midi);
  return Math.round((midi - nearestMidi) * 100);
}

export function frequencyToPitchInfo(frequency: number) {
  const midi = frequencyToMidi(frequency);
  const nearestMidi = Math.round(midi);
  return {
    frequency,
    midiNote: nearestMidi,
    noteName: midiToNoteName(nearestMidi),
    octave: midiToOctave(nearestMidi),
    centsOffset: frequencyToCents(frequency),
  };
}
