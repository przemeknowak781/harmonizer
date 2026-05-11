import pitchShifterWorkletUrl from "../worklets/pitch-shifter.worklet.ts?worker&url";

const moduleLoadedContexts = new WeakSet<AudioContext>();

export async function ensurePitchShifterModule(context: AudioContext): Promise<void> {
  if (moduleLoadedContexts.has(context)) return;
  await context.audioWorklet.addModule(pitchShifterWorkletUrl);
  moduleLoadedContexts.add(context);
}

export async function createPitchShifterNode(
  context: AudioContext,
): Promise<AudioWorkletNode> {
  await ensurePitchShifterModule(context);
  return new AudioWorkletNode(context, "pitch-shifter");
}

export function setPitchShiftRatio(
  node: AudioWorkletNode,
  ratio: number,
): void {
  node.port.postMessage({ type: "ratio", value: ratio });
}
