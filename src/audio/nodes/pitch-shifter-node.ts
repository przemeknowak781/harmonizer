export async function createPitchShifterNode(
  context: AudioContext,
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(
    new URL("../worklets/pitch-shifter.worklet.ts", import.meta.url),
  );

  return new AudioWorkletNode(context, "pitch-shifter");
}

export function setPitchShiftRatio(
  node: AudioWorkletNode,
  ratio: number,
): void {
  node.port.postMessage({ type: "ratio", value: ratio });
}
