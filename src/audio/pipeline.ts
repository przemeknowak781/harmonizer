import type { HarmonyPreset, NoteName, ModeName } from "../types/music";
import type { ChordProgression } from "../types/chords";
import { computeHarmony } from "../engine/harmony";
import { frequencyToMidi, midiToFrequency } from "../engine/pitch";
import { VoiceLeader } from "../engine/voice-leading";
import { getChordAtBeat } from "../engine/progressions";
import { getVoiceDelayMs } from "../engine/rhythm";
import { Transport } from "../engine/transport";
import { createEffectsChain, type EffectsChain } from "./effects";
import { createLooper, type Looper } from "./looper";
import {
  createPitchDetectorNode,
  type PitchCallback,
} from "./nodes/pitch-detector-node";
import {
  createPitchShifterNode,
  setPitchShiftRatio,
} from "./nodes/pitch-shifter-node";

const MAX_VOICES = 4;

export interface AudioPipeline {
  context: AudioContext;
  start: () => Promise<void>;
  stop: () => void;
  updateHarmony: (
    root: NoteName,
    mode: ModeName,
    preset: HarmonyPreset,
  ) => void;
  setDryVolume: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setVoiceVolume: (index: number, v: number) => void;
  setVoicePan: (index: number, pan: number) => void;
  getAnalyserNode: () => AnalyserNode;
  destroy: () => void;
  setHarmonyMode: (mode: "interval" | "chord") => void;
  setChordProgression: (prog: ChordProgression | null) => void;
  setRhythmPattern: (patternName: string, bpm: number) => void;
  setReverbMix: (v: number) => void;
  setDelayTime: (ms: number) => void;
  setDelayFeedback: (fb: number) => void;
  setDelayMix: (v: number) => void;
  getTransport: () => Transport;
  getLooper: () => Looper;
}

export async function createAudioPipeline(
  onPitch: PitchCallback,
): Promise<AudioPipeline> {
  const context = new AudioContext({ sampleRate: 44100 });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;

  // Pitch detector
  const pitchDetector = await createPitchDetectorNode(context);

  // Dry signal path
  const dryGain = context.createGain();
  dryGain.gain.value = 1;

  // Effects chain (between voices/dry and master)
  const effectsChain: EffectsChain = createEffectsChain(context);

  // Master gain
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;

  // Voice paths: shifter → gain → panner → delay → effects
  const voiceShifters: AudioWorkletNode[] = [];
  const voiceGains: GainNode[] = [];
  const voicePanners: StereoPannerNode[] = [];
  const voiceDelays: DelayNode[] = [];

  for (let i = 0; i < MAX_VOICES; i++) {
    const shifter = await createPitchShifterNode(context);
    const gain = context.createGain();
    gain.gain.value = 0;
    const panner = context.createStereoPanner();
    panner.pan.value = 0;
    const delay = context.createDelay(2);
    delay.delayTime.value = 0;

    source.connect(shifter);
    shifter.connect(gain);
    gain.connect(panner);
    panner.connect(delay);
    delay.connect(effectsChain.input);

    voiceShifters.push(shifter);
    voiceGains.push(gain);
    voicePanners.push(panner);
    voiceDelays.push(delay);
  }

  // Connect graph
  source.connect(analyser);
  source.connect(pitchDetector);
  source.connect(dryGain);

  // Dry goes through effects chain too
  dryGain.connect(effectsChain.input);
  effectsChain.output.connect(masterGain);
  masterGain.connect(context.destination);

  // Voice leader, transport, looper
  const voiceLeader = new VoiceLeader(MAX_VOICES);
  const transport = new Transport();
  const looper: Looper = createLooper(context);
  source.connect(looper.getNode());

  // Harmony state
  let currentRoot: NoteName = "C";
  let currentMode: ModeName = "major";
  let currentPreset: HarmonyPreset | null = null;
  let harmonyMode: "interval" | "chord" = "chord";
  let activeProgression: ChordProgression | null = null;

  function applyHarmony(frequency: number) {
    if (frequency <= 0) return;

    if (harmonyMode === "chord" && activeProgression) {
      // Chord-aware path
      const currentChord = getChordAtBeat(
        activeProgression,
        transport.getCurrentBeat(),
      );
      const sourceMidi = Math.round(frequencyToMidi(frequency));
      const voiceMidis = voiceLeader.transition(sourceMidi, currentChord);

      for (let i = 0; i < MAX_VOICES; i++) {
        const shifter = voiceShifters[i];
        const gain = voiceGains[i];
        const panner = voicePanners[i];
        if (!shifter || !gain || !panner) continue;

        const targetMidi = voiceMidis[i];
        const voiceConfig = currentPreset?.voices[i];
        if (targetMidi !== undefined && voiceConfig) {
          const targetFreq = midiToFrequency(targetMidi);
          setPitchShiftRatio(shifter, targetFreq / frequency);
          gain.gain.value = voiceConfig.volume;
          panner.pan.value = voiceConfig.pan;
        } else {
          gain.gain.value = 0;
        }
      }
    } else {
      // Original interval path (MVP behavior)
      if (!currentPreset) return;

      const result = computeHarmony(
        frequency,
        currentRoot,
        currentMode,
        currentPreset,
      );

      for (let i = 0; i < MAX_VOICES; i++) {
        const shifter = voiceShifters[i];
        const gain = voiceGains[i];
        const panner = voicePanners[i];
        if (!shifter || !gain || !panner) continue;

        const voice = result.voices[i];
        const voiceConfig = currentPreset.voices[i];
        if (voice && voiceConfig) {
          setPitchShiftRatio(shifter, voice.ratio);
          gain.gain.value = voiceConfig.volume;
          panner.pan.value = voiceConfig.pan;
        } else {
          gain.gain.value = 0;
        }
      }
    }
  }

  // Single pitch handler: update UI + apply harmony
  pitchDetector.port.onmessage = (event: MessageEvent) => {
    const data = event.data as {
      type: string;
      frequency: number;
      confidence: number;
    };
    if (data.type === "pitch") {
      onPitch(data.frequency, data.confidence);
      if (data.confidence > 0.8 && data.frequency > 0) {
        applyHarmony(data.frequency);
      }
    }
  };

  return {
    context,
    start: async () => {
      if (context.state === "suspended") await context.resume();
    },
    stop: () => {
      void context.suspend();
    },
    updateHarmony: (root, mode, preset) => {
      currentRoot = root;
      currentMode = mode;
      currentPreset = preset;
    },
    setDryVolume: (v) => {
      dryGain.gain.value = v;
    },
    setMasterVolume: (v) => {
      masterGain.gain.value = v;
    },
    setVoiceVolume: (index, v) => {
      const gain = voiceGains[index];
      if (gain) gain.gain.value = v;
    },
    setVoicePan: (index, pan) => {
      const panner = voicePanners[index];
      if (panner) panner.pan.value = pan;
    },
    getAnalyserNode: () => analyser,
    destroy: () => {
      transport.stop();
      looper.clear();
      effectsChain.destroy();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
    setHarmonyMode: (mode) => {
      harmonyMode = mode;
      if (mode === "chord") voiceLeader.reset();
    },
    setChordProgression: (prog) => {
      activeProgression = prog;
    },
    setRhythmPattern: (patternName, bpm) => {
      const delays = getVoiceDelayMs(patternName, bpm);
      for (let i = 0; i < MAX_VOICES; i++) {
        const delayNode = voiceDelays[i];
        const delayMs = delays[i];
        if (delayNode && delayMs !== undefined) {
          delayNode.delayTime.value = delayMs / 1000;
        }
      }
    },
    setReverbMix: (v) => effectsChain.setReverbMix(v),
    setDelayTime: (ms) => effectsChain.setDelayTime(ms),
    setDelayFeedback: (fb) => effectsChain.setDelayFeedback(fb),
    setDelayMix: (v) => effectsChain.setDelayMix(v),
    getTransport: () => transport,
    getLooper: () => looper,
  };
}
