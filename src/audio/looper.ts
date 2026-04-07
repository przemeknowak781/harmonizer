export type LooperState = "empty" | "recording" | "playing" | "overdubbing";

export interface Looper {
  state: LooperState;
  duration: number;
  record: () => void;
  stop: () => void;
  play: () => void;
  overdub: () => void;
  clear: () => void;
  getNode: () => AudioNode;
}

const MAX_LOOP_SECONDS = 30;

export function createLooper(context: AudioContext): Looper {
  let state: LooperState = "empty";
  let loopBuffer: AudioBuffer | null = null;
  let loopSource: AudioBufferSourceNode | null = null;
  let recorder: ScriptProcessorNode | null = null;
  let recordedChunks: Float32Array[] = [];
  let recordStartTime = 0;
  let duration = 0;

  const inputGain = context.createGain();
  inputGain.gain.value = 1;

  const outputGain = context.createGain();
  outputGain.gain.value = 1;
  outputGain.connect(context.destination);

  function startRecording(): void {
    recordedChunks = [];
    recordStartTime = context.currentTime;
    recorder = context.createScriptProcessor(4096, 1, 1);
    recorder.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      recordedChunks.push(new Float32Array(input));
    };
    inputGain.connect(recorder);
    recorder.connect(context.destination);
  }

  function stopRecording(): AudioBuffer {
    const recordDuration = Math.min(
      context.currentTime - recordStartTime,
      MAX_LOOP_SECONDS,
    );
    if (recorder) {
      recorder.disconnect();
      inputGain.disconnect(recorder);
      recorder = null;
    }
    const sampleRate = context.sampleRate;
    const totalSamples = Math.floor(recordDuration * sampleRate);
    const buffer = context.createBuffer(
      1,
      Math.max(1, totalSamples),
      sampleRate,
    );
    const channelData = buffer.getChannelData(0);
    let offset = 0;
    for (const chunk of recordedChunks) {
      const copyLength = Math.min(chunk.length, totalSamples - offset);
      if (copyLength > 0) channelData.set(chunk.subarray(0, copyLength), offset);
      offset += copyLength;
      if (offset >= totalSamples) break;
    }
    recordedChunks = [];
    return buffer;
  }

  function startPlayback(): void {
    if (!loopBuffer) return;
    stopPlayback();
    loopSource = context.createBufferSource();
    loopSource.buffer = loopBuffer;
    loopSource.loop = true;
    loopSource.connect(outputGain);
    loopSource.start();
  }

  function stopPlayback(): void {
    if (loopSource) {
      loopSource.stop();
      loopSource.disconnect();
      loopSource = null;
    }
  }

  function mixBuffers(
    base: AudioBuffer,
    overlay: AudioBuffer,
  ): AudioBuffer {
    const length = base.length;
    const mixed = context.createBuffer(1, length, context.sampleRate);
    const mixedData = mixed.getChannelData(0);
    const baseData = base.getChannelData(0);
    const overlayData = overlay.getChannelData(0);
    for (let i = 0; i < length; i++) {
      mixedData[i] =
        (baseData[i] ?? 0) + (i < overlayData.length ? (overlayData[i] ?? 0) : 0);
    }
    return mixed;
  }

  return {
    get state() {
      return state;
    },
    get duration() {
      return duration;
    },
    record() {
      if (state !== "empty") return;
      state = "recording";
      startRecording();
    },
    stop() {
      if (state === "recording") {
        loopBuffer = stopRecording();
        duration = loopBuffer.duration;
        state = "playing";
        startPlayback();
      } else if (state === "overdubbing") {
        const overdubBuffer = stopRecording();
        if (loopBuffer) loopBuffer = mixBuffers(loopBuffer, overdubBuffer);
        state = "playing";
        startPlayback();
      } else if (state === "playing") {
        stopPlayback();
        state = "playing";
      }
    },
    play() {
      if (state === "playing" || !loopBuffer) return;
      state = "playing";
      startPlayback();
    },
    overdub() {
      if (state !== "playing" || !loopBuffer) return;
      state = "overdubbing";
      startRecording();
    },
    clear() {
      stopPlayback();
      if (recorder) {
        recorder.disconnect();
        recorder = null;
      }
      loopBuffer = null;
      recordedChunks = [];
      duration = 0;
      state = "empty";
    },
    getNode() {
      return inputGain;
    },
  };
}
