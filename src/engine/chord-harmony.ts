import type { Chord } from "../types/chords";
import { getChordTones } from "./chords";
import { frequencyToMidi, midiToFrequency } from "./pitch";

export interface ChordHarmonyVoice {
  targetMidi: number;
  targetFrequency: number;
  ratio: number;
}

export interface ChordHarmonyResult {
  sourceMidi: number;
  sourceFrequency: number;
  voices: ChordHarmonyVoice[];
}

export function computeChordHarmony(
  sourceFrequency: number,
  chord: Chord,
  voiceCount: number,
): ChordHarmonyResult {
  const sourceMidi = Math.round(frequencyToMidi(sourceFrequency));
  const chordPitchClasses = getChordTones(chord);

  const singerPC = ((sourceMidi % 12) + 12) % 12;
  const singerChordIndex = findClosestIndex(singerPC, chordPitchClasses);

  const candidates: number[] = [];
  for (let octaveOffset = 0; octaveOffset <= 2; octaveOffset++) {
    for (let i = 0; i < chordPitchClasses.length; i++) {
      if (i === singerChordIndex && octaveOffset === 0) continue;
      const pc = chordPitchClasses[i]!;
      const midi = sourceMidi - (sourceMidi % 12) + pc + octaveOffset * 12;
      if (midi > sourceMidi && !candidates.includes(midi)) {
        candidates.push(midi);
      }
    }
  }

  candidates.sort((a, b) => Math.abs(a - sourceMidi) - Math.abs(b - sourceMidi));

  const voices: ChordHarmonyVoice[] = [];
  for (let i = 0; i < voiceCount && i < candidates.length; i++) {
    const targetMidi = candidates[i]!;
    const targetFrequency = midiToFrequency(targetMidi);
    voices.push({ targetMidi, targetFrequency, ratio: targetFrequency / sourceFrequency });
  }

  return { sourceMidi, sourceFrequency, voices };
}

function findClosestIndex(pitchClass: number, chordPCs: number[]): number {
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < chordPCs.length; i++) {
    const dist = Math.min(
      Math.abs(pitchClass - chordPCs[i]!),
      12 - Math.abs(pitchClass - chordPCs[i]!),
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}
