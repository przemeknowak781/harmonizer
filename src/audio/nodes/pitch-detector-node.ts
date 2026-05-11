import pitchDetectorWorkletUrl from "../worklets/pitch-detector.worklet.ts?worker&url";

export interface PitchMessage {
  type: "pitch";
  frequency: number;
  confidence: number;
}

export type PitchCallback = (frequency: number, confidence: number) => void;

export async function createPitchDetectorNode(
  context: AudioContext,
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(pitchDetectorWorkletUrl);

  return new AudioWorkletNode(context, "pitch-detector");
}
