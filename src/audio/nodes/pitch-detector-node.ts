export interface PitchMessage {
  type: "pitch";
  frequency: number;
  confidence: number;
}

export type PitchCallback = (frequency: number, confidence: number) => void;

export async function createPitchDetectorNode(
  context: AudioContext,
  onPitch: PitchCallback,
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(
    new URL("../worklets/pitch-detector.worklet.ts", import.meta.url),
  );

  const node = new AudioWorkletNode(context, "pitch-detector");

  node.port.onmessage = (event: MessageEvent<PitchMessage>) => {
    if (event.data.type === "pitch") {
      onPitch(event.data.frequency, event.data.confidence);
    }
  };

  return node;
}
