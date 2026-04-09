import type { HarmonyPreset, NoteName, ModeName } from "../types/music";
import type { ChordProgression } from "../types/chords";
import { computeGeometricHarmony } from "../engine/geometric-harmony";
import { computeHarmony } from "../engine/harmony";
import { frequencyToMidi, midiToFrequency } from "../engine/pitch";
import { MelodyAnalyzer } from "../engine/melody-analyzer";
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
import {
  COF_PRESETS,
  cofRatio,
  octaveReduce,
  type CofPreset,
} from "../engine/circle-of-fifths";
import { AdaptiveHarmony } from "../engine/adaptive-harmony";
import { createStringEnsemble, type StringEnsemble } from "./string-ensemble";
import { createOrchestra, type Orchestra } from "./orchestra";
import { renderOffline, type OfflineVoiceConfig } from "./offline-renderer";

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
  setHarmonyMode: (mode: "interval" | "chord" | "fifths" | "geometric" | "adaptive") => void;
  setCofPreset: (name: string) => void;
  setChordProgression: (prog: ChordProgression | null) => void;
  setRhythmPattern: (patternName: string, bpm: number) => void;
  setReverbMix: (v: number) => void;
  setDelayTime: (ms: number) => void;
  setDelayFeedback: (fb: number) => void;
  setDelayMix: (v: number) => void;
  setCustomCofVoices: (voices: { steps: number; octaveReduce: boolean; volume: number; pan: number; active: boolean; octaveShift: number }[]) => void;
  setMaxTransposeRatio: (ratio: number) => void;
  setMinTransposeRatio: (ratio: number) => void;
  setSmoothConfig: (config: {
    fadeEnabled: boolean;
    fadeMs: number;
    portamentoEnabled: boolean;
    portamentoMs: number;
    jitterCents: number;
  }) => void;
  getTransport: () => Transport;
  getLooper: () => Looper;
  /** String Ensemble controls */
  setStringsEnabled: (enabled: boolean) => void;
  setStringsVolume: (v: number) => void;
  setStringsBrightness: (b: number) => void;
  setStringsAttack: (s: number) => void;
  /** Orchestra controls */
  loadOrchestra: () => Promise<void>;
  setOrchestraEnabled: (e: boolean) => void;
  setOrchestraVolume: (v: number) => void;
  setOrchestraSectionEnabled: (section: string, enabled: boolean) => void;
  setOrchestraPattern: (p: string) => void;
  getOrchestraProgress: () => number;
  isOrchestraLoaded: () => boolean;
  /** Get live pitch ratios per voice (updated every frame). */
  getVoiceRatios: () => number[];
  /** Render a dry recording through all voices offline. Returns stereo mixdown. */
  renderRecording: (dryBuffer: AudioBuffer) => AudioBuffer;
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

  const rawSource = context.createMediaStreamSource(stream);

  // ── Input normalizer: compressor to tame hot mic signals ──
  const inputCompressor = context.createDynamicsCompressor();
  inputCompressor.threshold.value = -24;  // start compressing at -24 dB
  inputCompressor.knee.value = 12;        // wide soft knee
  inputCompressor.ratio.value = 4;        // 4:1 compression
  inputCompressor.attack.value = 0.003;   // 3ms attack
  inputCompressor.release.value = 0.15;   // 150ms release

  const inputGain = context.createGain();
  inputGain.gain.value = 0.8; // slight reduction after compression

  rawSource.connect(inputCompressor);
  inputCompressor.connect(inputGain);

  // "source" is now the normalized signal
  const source = inputGain;

  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;

  // Pitch detector
  const pitchDetector = await createPitchDetectorNode(context);

  // Dry signal path
  const dryGain = context.createGain();
  dryGain.gain.value = 1;

  // Effects chain (between voices/dry and master)
  const effectsChain: EffectsChain = createEffectsChain(context);

  // Limiter (DynamicsCompressorNode) to prevent clipping with multiple voices
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -12;  // start compressing earlier (-12 dB)
  limiter.knee.value = 10;        // wide soft knee — gradual onset
  limiter.ratio.value = 20;       // aggressive ratio = limiter behavior
  limiter.attack.value = 0.002;   // 2ms attack — catch transients
  limiter.release.value = 0.1;    // 100ms release — smoother recovery

  // Master gain (conservative to prevent clipping with multi-voice)
  const masterGain = context.createGain();
  masterGain.gain.value = 0.6;

  // Voice paths: shifter → formant correction → gain → panner → delay → effects
  const voiceShifters: AudioWorkletNode[] = [];
  const voiceGains: GainNode[] = [];
  const voicePanners: StereoPannerNode[] = [];
  const voiceDelays: DelayNode[] = [];

  /**
   * Formant correction EQ per voice.
   * After pitch shifting by ratio R, formants are also shifted by R.
   * We counter-shift them with a 3-band parametric EQ:
   *   - lowShelf: boost/cut at ~300 Hz (fundamental formant F1 region)
   *   - peak: boost/cut at ~1500 Hz (F2/F3 transition — the "character" region)
   *   - highShelf: boost/cut at ~4000 Hz (presence/sibilance)
   */
  interface FormantEQ {
    lowShelf: BiquadFilterNode;
    peak: BiquadFilterNode;
    highShelf: BiquadFilterNode;
  }
  const voiceFormantEQs: FormantEQ[] = [];

  function createFormantEQ(): FormantEQ {
    const lowShelf = context.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 300;
    lowShelf.gain.value = 0;

    const peak = context.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = 1500;
    peak.Q.value = 1.5;
    peak.gain.value = 0;

    const highShelf = context.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 4000;
    highShelf.gain.value = 0;

    lowShelf.connect(peak);
    peak.connect(highShelf);

    return { lowShelf, peak, highShelf };
  }

  /**
   * Update formant correction EQ for a given pitch ratio.
   * The correction counters the formant shift introduced by pitch shifting.
   *
   * Shift UP (ratio > 1): formants moved too high → boost lows, cut highs
   * Shift DOWN (ratio < 1): formants moved too low → cut lows, boost highs
   *
   * Correction strength scales with |log2(ratio)| in octaves.
   */
  function updateFormantEQ(eq: FormantEQ, ratio: number): void {
    const octaves = Math.log2(ratio); // positive = up, negative = down
    const strength = Math.min(Math.abs(octaves), 1.5); // cap at 1.5 octaves

    // dB correction — up to ±8 dB per band
    const correction = strength * 5.5; // dB per octave of shift

    if (octaves > 0.05) {
      // Shifted UP — formanty za wysoko → boost lows, cut highs
      eq.lowShelf.gain.value = correction;
      eq.peak.gain.value = correction * 0.4;
      eq.highShelf.gain.value = -correction;
    } else if (octaves < -0.05) {
      // Shifted DOWN — formanty za nisko → cut lows, boost highs
      eq.lowShelf.gain.value = -correction;
      eq.peak.gain.value = -correction * 0.4;
      eq.highShelf.gain.value = correction;
    } else {
      // Near unison — no correction
      eq.lowShelf.gain.value = 0;
      eq.peak.gain.value = 0;
      eq.highShelf.gain.value = 0;
    }
  }

  for (let i = 0; i < MAX_VOICES; i++) {
    const shifter = await createPitchShifterNode(context);
    const formantEQ = createFormantEQ();
    const gain = context.createGain();
    gain.gain.value = 0;
    const panner = context.createStereoPanner();
    panner.pan.value = 0;
    const delay = context.createDelay(2);
    delay.delayTime.value = 0;

    // Chain: source → shifter → formantEQ → gain → panner → delay → effects
    source.connect(shifter);
    shifter.connect(formantEQ.lowShelf);     // into formant correction
    formantEQ.highShelf.connect(gain);        // out of formant correction
    gain.connect(panner);
    panner.connect(delay);
    delay.connect(effectsChain.input);

    voiceShifters.push(shifter);
    voiceFormantEQs.push(formantEQ);
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
  masterGain.connect(limiter);
  limiter.connect(context.destination);

  // Voice leader, transport, looper
  const voiceLeader = new VoiceLeader(MAX_VOICES);
  const melodyAnalyzer = new MelodyAnalyzer();
  const adaptiveHarmony = new AdaptiveHarmony();

  // String ensemble — connects to effects chain input (gets reverb/delay too)
  const stringEnsemble: StringEnsemble = createStringEnsemble(context, effectsChain.input);

  // Orchestra — sample-based strings, connects to effects
  const orchestra: Orchestra = createOrchestra(context, effectsChain.input);
  const transport = new Transport();
  const looper: Looper = createLooper(context);
  source.connect(looper.getNode());

  // Harmony state
  let currentRoot: NoteName = "C";
  let currentMode: ModeName = "major";
  let currentPreset: HarmonyPreset | null = null;
  let harmonyMode: "interval" | "chord" | "fifths" | "geometric" | "adaptive" = "chord";
  let currentCofPreset: CofPreset = COF_PRESETS[0]!;
  let activeProgression: ChordProgression | null = null;
  let customCofVoices: { steps: number; octaveReduce: boolean; volume: number; pan: number; active: boolean; octaveShift: number }[] = [];

  /**
   * Get volume/pan/octaveShift for voice i from store state.
   * Falls back to preset config if store state not available.
   * Respects active flag — inactive voice = volume 0.
   */
  function getVoiceState(
    i: number,
    fallbackVolume: number,
    fallbackPan: number,
  ): { volume: number; pan: number; octaveShift: number } {
    const sv = customCofVoices[i];
    if (sv) {
      return {
        volume: sv.active ? sv.volume : 0,
        pan: sv.pan,
        octaveShift: (sv as { octaveShift?: number }).octaveShift ?? 0,
      };
    }
    return { volume: fallbackVolume, pan: fallbackPan, octaveShift: 0 };
  }

  // --- Configurable smoothing parameters (stored for UI round-trip) ---
  let portamentoEnabled = true;

  /** Set gain — direct assignment. */
  function smoothGain(gainNode: GainNode, target: number): void {
    gainNode.gain.value = target;
  }

  /** Set pan — direct assignment. */
  function smoothPan(pannerNode: StereoPannerNode, target: number): void {
    pannerNode.pan.value = target;
  }

  /**
   * Legato / portamento — smooth pitch ratio transitions.
   * Prevents the "bad autotune" effect when pitch detection jitters.
   */
  const voiceCurrentRatios: number[] = new Array(MAX_VOICES).fill(1);

  function smoothRatio(voiceIndex: number, shifterNode: AudioWorkletNode, targetRatio: number): void {
    if (!portamentoEnabled) {
      voiceCurrentRatios[voiceIndex] = targetRatio;
      setPitchShiftRatio(shifterNode, targetRatio);
      return;
    }

    const currentRatio = voiceCurrentRatios[voiceIndex] ?? 1;

    // Skip only truly identical values
    if (Math.abs(targetRatio - currentRatio) < 0.0001) return;

    // Large jump (> 1 octave) — snap immediately
    const changeCents = Math.abs(1200 * Math.log2(targetRatio / currentRatio));
    if (changeCents > 1200) {
      voiceCurrentRatios[voiceIndex] = targetRatio;
      setPitchShiftRatio(shifterNode, targetRatio);
      return;
    }

    // Glide — always send update, let the worklet's own smoothing handle the rest
    const alpha = 0.3; // faster convergence
    const smoothed = currentRatio + (targetRatio - currentRatio) * alpha;
    voiceCurrentRatios[voiceIndex] = smoothed;
    setPitchShiftRatio(shifterNode, smoothed);
  }

  let maxTransposeRatio = 4;    // upper limit (2 oct up)
  let minTransposeRatio = 0.25; // lower limit (2 oct down)

  /** Apply octave shift to a ratio, then fold by octaves to stay within [min, max]. */
  function applyOctaveShift(ratio: number, shift: number): number {
    let r = ratio * Math.pow(2, shift);
    // Fold down if above max
    while (r > maxTransposeRatio) {
      r /= 2;
    }
    // Fold up if below min
    while (r < minTransposeRatio) {
      r *= 2;
    }
    return r;
  }

  /**
   * Anti-chipmunk volume rolloff.
   * Smoothly attenuates voices as pitch shift ratio moves away from 1.0.
   * Returns a gain multiplier 0–1.
   *
   * - Ratio 1.0 (unison) = 1.0 gain (full volume)
   * - Ratio 1.5 (P5) = ~0.95 gain (barely noticeable)
   * - Ratio 2.0 (octave) = ~0.8 gain
   * - Ratio 3.0+ = ~0.4 gain (chipmunk territory, heavily attenuated)
   *
   * Uses distance in octaves: |log2(ratio)|, with smooth cosine rolloff.
   */
  function formantRolloff(ratio: number): number {
    if (ratio <= 0) return 0;
    const octaves = Math.abs(Math.log2(ratio));
    // Start rolling off at 1.2 octaves, full attenuation at 3 octaves
    // (less aggressive now that formant EQ handles most correction)
    const onset = 1.2;
    const full = 3.0;
    if (octaves <= onset) return 1;
    if (octaves >= full) return 0.15; // never fully silent, just very quiet
    // Smooth cosine interpolation
    const t = (octaves - onset) / (full - onset);
    return 1 - t * t * 0.85; // quadratic rolloff, floor at 0.15
  }

  function applyHarmony(frequency: number) {
    if (frequency <= 0) return;

    if (harmonyMode === "adaptive") {
      // Count active voices
      const activeCount = customCofVoices.filter((v) => v.active).length || 2;
      const result = adaptiveHarmony.compute(frequency, activeCount);

      let voiceIdx = 0;
      for (let i = 0; i < MAX_VOICES; i++) {
        const shifter = voiceShifters[i];
        const gain = voiceGains[i];
        const panner = voicePanners[i];
        if (!shifter || !gain || !panner) continue;

        const cv = customCofVoices[i];
        const adaptiveVoice = result.voices[voiceIdx];

        if (cv && cv.active && adaptiveVoice) {
          let ratio = adaptiveVoice.ratio;
          ratio *= Math.pow(2, cv.octaveShift);
          while (ratio > maxTransposeRatio) ratio /= 2;
          while (ratio < minTransposeRatio) ratio *= 2;

          setPitchShiftRatio(shifter, ratio);
          voiceCurrentRatios[i] = ratio;
          const feq = voiceFormantEQs[i];
          if (feq) updateFormantEQ(feq, ratio);
          smoothGain(gain, cv.volume * formantRolloff(ratio));
          smoothPan(panner, cv.pan);
          voiceIdx++;
        } else {
          smoothGain(gain, 0);
        }
      }
      return;
    }

    if (harmonyMode === "fifths") {
      // Use customCofVoices directly (no filter!) — index i maps to voiceShifters[i]
      for (let i = 0; i < MAX_VOICES; i++) {
        const shifter = voiceShifters[i];
        const gain = voiceGains[i];
        const panner = voicePanners[i];
        if (!shifter || !gain || !panner) continue;

        const cv = customCofVoices[i];
        if (cv && cv.active) {
          const ratio = cofRatio(cv.steps);
          const reduced = cv.octaveReduce ? octaveReduce(ratio) : ratio;
          const finalRatio = applyOctaveShift(reduced, cv.octaveShift);
          setPitchShiftRatio(shifter, finalRatio);
          voiceCurrentRatios[i] = finalRatio;
          const feq = voiceFormantEQs[i];
          if (feq) updateFormantEQ(feq, finalRatio);
          smoothGain(gain, cv.volume * formantRolloff(finalRatio));
          smoothPan(panner, cv.pan);
        } else if (!cv) {
          // Fallback to preset
          const presetVoice = currentCofPreset.voices[i];
          if (presetVoice) {
            const ratio = cofRatio(presetVoice.steps);
            const reduced = presetVoice.octaveReduce ? octaveReduce(ratio) : ratio;
            const gp = getVoiceState(i, presetVoice.volume, presetVoice.pan);
            const finalRatio = applyOctaveShift(reduced, gp.octaveShift);
            smoothRatio(i, shifter, finalRatio);
            smoothGain(gain, gp.volume * formantRolloff(finalRatio));
            smoothPan(panner, gp.pan);
          } else {
            smoothGain(gain, 0);
          }
        } else {
          smoothGain(gain, 0);
        }
      }
      return;
    }

    if (harmonyMode === "geometric") {
      // Auto-detect chord quality from melody — no progression needed
      const quality = melodyAnalyzer.addPitch(frequency);

      const result = computeGeometricHarmony(frequency, quality, MAX_VOICES);

      for (let i = 0; i < MAX_VOICES; i++) {
        const shifter = voiceShifters[i];
        const gain = voiceGains[i];
        const panner = voicePanners[i];
        if (!shifter || !gain || !panner) continue;

        const voice = result.voices[i];
        if (voice) {
          const defaultPan = i === 0 ? -0.4 : i === 1 ? 0.4 : i === 2 ? 0 : -0.2;
          const gp = getVoiceState(i, 0.75, defaultPan);
          const finalRatio = applyOctaveShift(voice.ratio, gp.octaveShift);
          setPitchShiftRatio(shifter, finalRatio);
          voiceCurrentRatios[i] = finalRatio;
          const feq = voiceFormantEQs[i];
          if (feq) updateFormantEQ(feq, finalRatio);
          smoothGain(gain, gp.volume * formantRolloff(finalRatio));
          smoothPan(panner, gp.pan);
        } else {
          smoothGain(gain, 0);
        }
      }
      return;
    }

    if (harmonyMode === "chord" && activeProgression) {
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
          const gp = getVoiceState(i, voiceConfig.volume, voiceConfig.pan);
          const finalRatio = applyOctaveShift(targetFreq / frequency, gp.octaveShift);
          setPitchShiftRatio(shifter, finalRatio);
          voiceCurrentRatios[i] = finalRatio;
          const feq = voiceFormantEQs[i];
          if (feq) updateFormantEQ(feq, finalRatio);
          smoothGain(gain, gp.volume * formantRolloff(finalRatio));
          smoothPan(panner, gp.pan);
        } else {
          smoothGain(gain, 0);
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
          const gp = getVoiceState(i, voiceConfig.volume, voiceConfig.pan);
          const finalRatio = applyOctaveShift(voice.ratio, gp.octaveShift);
          setPitchShiftRatio(shifter, finalRatio);
          voiceCurrentRatios[i] = finalRatio;
          const feq = voiceFormantEQs[i];
          if (feq) updateFormantEQ(feq, finalRatio);
          smoothGain(gain, gp.volume * formantRolloff(finalRatio));
          smoothPan(panner, gp.pan);
        } else {
          smoothGain(gain, 0);
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

        // Feed string ensemble with harmony frequencies
        if (stringEnsemble.isEnabled()) {
          const freqs: (number | null)[] = [data.frequency]; // root = singer
          for (let i = 0; i < MAX_VOICES; i++) {
            const r = voiceCurrentRatios[i];
            const cv = customCofVoices[i];
            if (r && cv?.active && Math.abs(r - 1) > 0.001) {
              freqs.push(data.frequency * r);
            }
          }
          stringEnsemble.update(freqs);
        }
        // Feed orchestra with root + ratios
        if (orchestra.isEnabled() && orchestra.isLoaded()) {
          const activeRatios: number[] = [];
          for (let i = 0; i < MAX_VOICES; i++) {
            const r = voiceCurrentRatios[i];
            const cv = customCofVoices[i];
            if (r && cv?.active && Math.abs(r - 1) > 0.001) {
              activeRatios.push(r);
            }
          }
          orchestra.update(data.frequency, activeRatios);
        }
      } else {
        // No pitch — silence strings and orchestra
        if (stringEnsemble.isEnabled()) {
          stringEnsemble.update([null, null, null, null, null, null]);
        }
        if (orchestra.isEnabled()) {
          orchestra.silence();
        }
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
      stringEnsemble.destroy();
      orchestra.destroy();
      effectsChain.destroy();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
    setHarmonyMode: (mode) => {
      harmonyMode = mode;
      if (mode === "chord") voiceLeader.reset();
      if (mode === "geometric") melodyAnalyzer.reset();
      if (mode === "adaptive") adaptiveHarmony.reset();
    },
    setCofPreset: (name) => {
      const found = COF_PRESETS.find((p) => p.name === name);
      if (found) currentCofPreset = found;
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
    setCustomCofVoices: (voices) => {
      customCofVoices = voices;
    },
    setMaxTransposeRatio: (ratio) => {
      maxTransposeRatio = Math.max(1, Math.min(8, ratio));
    },
    setMinTransposeRatio: (ratio) => {
      minTransposeRatio = Math.max(0.125, Math.min(1, ratio));
    },
    setSmoothConfig: (config) => {
      portamentoEnabled = config.portamentoEnabled;
    },
    setReverbMix: (v) => effectsChain.setReverbMix(v),
    setDelayTime: (ms) => effectsChain.setDelayTime(ms),
    setDelayFeedback: (fb) => effectsChain.setDelayFeedback(fb),
    setDelayMix: (v) => effectsChain.setDelayMix(v),
    getTransport: () => transport,
    getLooper: () => looper,
    loadOrchestra: () => orchestra.load(),
    setOrchestraEnabled: (e) => orchestra.setEnabled(e),
    setOrchestraVolume: (v) => orchestra.setVolume(v),
    setOrchestraSectionEnabled: (section, e) => orchestra.setSectionEnabled(section, e),
    setOrchestraPattern: (p) => orchestra.setPattern(p as "sustained" | "arpeggiated" | "tremolo-drama" | "pizz-pulse" | "cinematic"),
    getOrchestraProgress: () => orchestra.getProgress(),
    isOrchestraLoaded: () => orchestra.isLoaded(),
    setStringsEnabled: (e) => stringEnsemble.setEnabled(e),
    setStringsVolume: (v) => stringEnsemble.setVolume(v),
    setStringsBrightness: (b) => stringEnsemble.setBrightness(b),
    setStringsAttack: (s) => stringEnsemble.setAttack(s),
    getVoiceRatios: () => [...voiceCurrentRatios],
    renderRecording: (dryBuffer: AudioBuffer): AudioBuffer => {
      // Collect active voice configs (volume/pan only — ratio computed per-block)
      const offlineVoices: OfflineVoiceConfig[] = [];
      const activeIndices: number[] = [];

      for (let i = 0; i < MAX_VOICES; i++) {
        const cv = customCofVoices[i];
        if (!cv || !cv.active) continue;
        activeIndices.push(i);
        offlineVoices.push({ volume: cv.volume, pan: cv.pan });
      }

      // computeRatios: called per-block with detected frequency
      // Runs the SAME harmony logic as applyHarmony but returns ratios
      const computeRatios = (frequency: number): number[] => {
        const ratios: number[] = [];

        if (harmonyMode === "adaptive") {
          const result = adaptiveHarmony.compute(frequency, activeIndices.length);
          for (let v = 0; v < activeIndices.length; v++) {
            const idx = activeIndices[v]!;
            const cv = customCofVoices[idx];
            const av = result.voices[v];
            if (av && cv) {
              let r = av.ratio * Math.pow(2, cv.octaveShift);
              while (r > maxTransposeRatio) r /= 2;
              while (r < minTransposeRatio) r *= 2;
              ratios.push(r);
            } else {
              ratios.push(1);
            }
          }
        } else if (harmonyMode === "fifths") {
          for (const idx of activeIndices) {
            const cv = customCofVoices[idx];
            if (!cv) { ratios.push(1); continue; }
            const raw = cofRatio(cv.steps);
            const reduced = cv.octaveReduce ? octaveReduce(raw) : raw;
            let r = reduced * Math.pow(2, cv.octaveShift);
            while (r > maxTransposeRatio) r /= 2;
            while (r < minTransposeRatio) r *= 2;
            ratios.push(r);
          }
        } else if (harmonyMode === "geometric") {
          const quality = melodyAnalyzer.addPitch(frequency);
          const result = computeGeometricHarmony(frequency, quality, MAX_VOICES);
          for (let v = 0; v < activeIndices.length; v++) {
            const idx = activeIndices[v]!;
            const cv = customCofVoices[idx];
            const voice = result.voices[v];
            if (voice && cv) {
              let r = voice.ratio * Math.pow(2, cv.octaveShift);
              while (r > maxTransposeRatio) r /= 2;
              while (r < minTransposeRatio) r *= 2;
              ratios.push(r);
            } else {
              ratios.push(1);
            }
          }
        } else if (harmonyMode === "chord" && activeProgression) {
          const chord = getChordAtBeat(activeProgression, transport.getCurrentBeat());
          const sourceMidi = Math.round(frequencyToMidi(frequency));
          const voiceMidis = voiceLeader.transition(sourceMidi, chord);
          for (let v = 0; v < activeIndices.length; v++) {
            const idx = activeIndices[v]!;
            const cv = customCofVoices[idx];
            const targetMidi = voiceMidis[v];
            if (targetMidi !== undefined && cv) {
              const targetFreq = midiToFrequency(targetMidi);
              let r = (targetFreq / frequency) * Math.pow(2, cv.octaveShift);
              while (r > maxTransposeRatio) r /= 2;
              while (r < minTransposeRatio) r *= 2;
              ratios.push(r);
            } else {
              ratios.push(1);
            }
          }
        } else {
          // Interval mode
          if (currentPreset) {
            const result = computeHarmony(frequency, currentRoot, currentMode, currentPreset);
            for (let v = 0; v < activeIndices.length; v++) {
              const idx = activeIndices[v]!;
              const cv = customCofVoices[idx];
              const voice = result.voices[v];
              if (voice && cv) {
                let r = voice.ratio * Math.pow(2, cv.octaveShift);
                while (r > maxTransposeRatio) r /= 2;
                while (r < minTransposeRatio) r *= 2;
                ratios.push(r);
              } else {
                ratios.push(1);
              }
            }
          }
        }

        return ratios;
      };

      return renderOffline(dryBuffer, {
        dryVolume: dryGain.gain.value,
        voices: offlineVoices,
        reverbMix: effectsChain.getReverbMix(),
        delayTime: effectsChain.getDelayTime(),
        delayFeedback: effectsChain.getDelayFeedback(),
        delayMix: effectsChain.getDelayMix(),
        sampleRate: context.sampleRate,
        computeRatios,
      });
    },
  };
}
