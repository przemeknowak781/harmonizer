import type { NoteName, ModeName, HarmonyPreset, HarmonyResult, VoiceConfig } from "../types/music";
import { INTERVAL_STEPS } from "./constants";
import { frequencyToMidi, midiToFrequency } from "./pitch";
import { getScaleDegree, getScaleNotes, snapToScale } from "./scales";

function computeVoiceFrequency(
  sourceMidi: number,
  voice: VoiceConfig,
  root: NoteName,
  mode: ModeName,
): number {
  const scaleNotes = getScaleNotes(root, mode);
  const scaleSize = scaleNotes.length;
  const degree = getScaleDegree(sourceMidi, root, mode);
  const steps = INTERVAL_STEPS[voice.interval];
  const direction = voice.direction === "up" ? 1 : -1;
  const targetDegree = degree + steps * direction;

  const octaveShift = Math.floor(targetDegree / scaleSize);
  const normalizedDegree = ((targetDegree % scaleSize) + scaleSize) % scaleSize;
  const targetPitchClass = scaleNotes[normalizedDegree]!;

  const sourceOctaveBase = sourceMidi - (sourceMidi % 12);
  let targetMidi = sourceOctaveBase + targetPitchClass + octaveShift * 12;

  if (voice.direction === "up" && targetMidi <= sourceMidi && voice.interval !== "unison") {
    targetMidi += 12;
  } else if (voice.direction === "down" && targetMidi >= sourceMidi && voice.interval !== "unison") {
    targetMidi -= 12;
  }

  const detuneOffset = voice.detuneCents / 100;
  return midiToFrequency(targetMidi + detuneOffset);
}

export function computeHarmony(
  sourceFrequency: number,
  root: NoteName,
  mode: ModeName,
  preset: HarmonyPreset,
): HarmonyResult {
  const sourceMidi = Math.round(frequencyToMidi(sourceFrequency));
  const snappedMidi = snapToScale(sourceMidi, root, mode);

  const voices = preset.voices.map((voice) => {
    const targetFrequency = computeVoiceFrequency(snappedMidi, voice, root, mode);
    return {
      targetFrequency,
      ratio: targetFrequency / sourceFrequency,
      interval: voice.interval,
      direction: voice.direction,
    };
  });

  return { sourceFrequency, voices };
}
