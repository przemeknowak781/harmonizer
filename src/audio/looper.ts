/**
 * Audio Looper with Offline Harmony Rendering
 *
 * Records dry voice → on stop, renders through all harmony voices
 * offline (via pipeline.renderRecording) → plays back stereo mixdown.
 *
 * States: empty → recording → rendering → playing → overdubbing → playing
 */

export type LooperState = "empty" | "recording" | "rendering" | "playing" | "overdubbing";

export interface Looper {
  state: LooperState;
  duration: number;
  record: () => void;
  stop: (renderFn?: (dryBuffer: AudioBuffer) => AudioBuffer) => void;
  play: () => void;
  overdub: () => void;
  clear: () => void;
  getNode: () => AudioNode;
  /** Get the raw dry recording (for offline rendering) */
  getDryBuffer: () => AudioBuffer | null;
  /** Set the rendered stereo buffer for playback */
  setRenderedBuffer: (buffer: AudioBuffer) => void;
}

const MAX_LOOP_SECONDS = 30;

export function createLooper(context: AudioContext): Looper {
  let state: LooperState = "empty";
  let dryBuffer: AudioBuffer | null = null;    // raw recording
  let loopBuffer: AudioBuffer | null = null;    // rendered stereo mixdown
  let loopSource: AudioBufferSourceNode | null = null;
  let recorder: ScriptProcessorNode | null = null;
  let recordedChunks: Float32Array[] = [];
  let recordStartTime = 0;
  let duration = 0;

  const inputGain = context.createGain();
  inputGain.gain.value = 1;

  // Stereo output for rendered buffer
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
    recorder.connect(context.destination); // must connect to process
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
    const buffer = context.createBuffer(1, Math.max(1, totalSamples), sampleRate);
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

    // Stereo buffer: connect both channels
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

  function mixStereoBuffers(base: AudioBuffer, overlay: AudioBuffer): AudioBuffer {
    const channels = Math.max(base.numberOfChannels, overlay.numberOfChannels);
    const length = Math.max(base.length, overlay.length);
    const mixed = context.createBuffer(channels, length, context.sampleRate);

    for (let ch = 0; ch < channels; ch++) {
      const mixedData = mixed.getChannelData(ch);
      const baseData = ch < base.numberOfChannels ? base.getChannelData(ch) : null;
      const overlayData = ch < overlay.numberOfChannels ? overlay.getChannelData(ch) : null;

      for (let i = 0; i < length; i++) {
        const b = baseData && i < base.length ? (baseData[i] ?? 0) : 0;
        const o = overlayData && i < overlay.length ? (overlayData[i] ?? 0) : 0;
        mixedData[i] = b + o;
      }
    }

    return mixed;
  }

  return {
    get state() { return state; },
    get duration() { return duration; },

    record() {
      if (state !== "empty") return;
      state = "recording";
      startRecording();
    },

    stop(renderFn) {
      if (state === "recording") {
        dryBuffer = stopRecording();
        duration = dryBuffer.duration;

        if (renderFn) {
          // Offline render through all voices
          state = "rendering";
          // Use setTimeout to not block the UI
          setTimeout(() => {
            loopBuffer = renderFn(dryBuffer!);
            state = "playing";
            startPlayback();
          }, 0);
        } else {
          // Fallback: play dry
          loopBuffer = dryBuffer;
          state = "playing";
          startPlayback();
        }
      } else if (state === "overdubbing") {
        const overdubDry = stopRecording();
        let overdubRendered: AudioBuffer;
        if (renderFn) {
          overdubRendered = renderFn(overdubDry);
        } else {
          overdubRendered = overdubDry;
        }
        if (loopBuffer) {
          loopBuffer = mixStereoBuffers(loopBuffer, overdubRendered);
        }
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
      if (recorder) { recorder.disconnect(); recorder = null; }
      dryBuffer = null;
      loopBuffer = null;
      recordedChunks = [];
      duration = 0;
      state = "empty";
    },

    getNode() { return inputGain; },

    getDryBuffer() { return dryBuffer; },

    setRenderedBuffer(buffer: AudioBuffer) {
      loopBuffer = buffer;
      duration = buffer.duration;
    },
  };
}
