/**
 * String Ensemble Synthesizer
 *
 * Solina-style analog string synthesis:
 * - 3 detuned sawtooth oscillators per voice = chorus/ensemble effect
 * - Low-pass filter for warmth (removes harsh high harmonics)
 * - ADSR envelope (slow attack ~200ms mimics bow on string)
 * - Optional vibrato (LFO on pitch)
 *
 * Architecture:
 *   [Osc1]──┐
 *   [Osc2]──┼──[LPF]──[VCA/Envelope]──[Panner]──→ output
 *   [Osc3]──┘
 *
 * Runs on native Web Audio nodes — zero samples, zero AudioWorklet,
 * does NOT touch the pitch shifter pipeline.
 */

export interface StringVoiceParams {
  frequency: number;
  volume: number;       // 0-1
  pan: number;          // -1 to 1
  brightness: number;   // 0-1 → LPF cutoff 400-4000 Hz
  attack: number;       // seconds (0.01 - 1.0)
  release: number;      // seconds (0.05 - 2.0)
  vibratoRate: number;  // Hz (0 = off, typical 4-6 Hz)
  vibratoDepth: number; // cents (0-30)
}

const DEFAULT_PARAMS: StringVoiceParams = {
  frequency: 440,
  volume: 0.6,
  pan: 0,
  brightness: 0.5,
  attack: 0.2,
  release: 0.4,
  vibratoRate: 5,
  vibratoDepth: 12,
};

/** Detune offsets in cents for the 3 oscillators — creates ensemble chorus. */
const DETUNE_OFFSETS = [-8, 0, 8] as const;

/**
 * A single string voice (one note).
 * Create → setFrequency → noteOn → noteOff → destroy
 */
export interface StringVoice {
  setFrequency: (hz: number) => void;
  setVolume: (v: number) => void;
  setPan: (p: number) => void;
  setBrightness: (b: number) => void;
  noteOn: () => void;
  noteOff: () => void;
  isActive: () => boolean;
  destroy: () => void;
}

export function createStringVoice(
  context: AudioContext,
  output: AudioNode,
  params: Partial<StringVoiceParams> = {},
): StringVoice {
  const p = { ...DEFAULT_PARAMS, ...params };
  let active = false;

  // 3 detuned sawtooth oscillators
  const oscs: OscillatorNode[] = [];
  const oscGains: GainNode[] = []; // individual osc level

  for (const detune of DETUNE_OFFSETS) {
    const osc = context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = p.frequency;
    osc.detune.value = detune;

    const oscGain = context.createGain();
    oscGain.gain.value = 1 / DETUNE_OFFSETS.length; // normalize to prevent clipping

    osc.connect(oscGain);
    oscs.push(osc);
    oscGains.push(oscGain);
  }

  // Low-pass filter (warmth)
  const lpf = context.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 400 + p.brightness * 3600; // 400 - 4000 Hz
  lpf.Q.value = 0.7; // gentle resonance

  // Second LPF for extra smoothness (12dB → 24dB/oct)
  const lpf2 = context.createBiquadFilter();
  lpf2.type = "lowpass";
  lpf2.frequency.value = lpf.frequency.value * 1.2;
  lpf2.Q.value = 0.5;

  // VCA (envelope-controlled gain)
  const vca = context.createGain();
  vca.gain.value = 0; // starts silent

  // Panner
  const panner = context.createStereoPanner();
  panner.pan.value = p.pan;

  // Output gain (volume)
  const outputGain = context.createGain();
  outputGain.gain.value = p.volume;

  // Vibrato LFO
  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = p.vibratoRate;
  const lfoGain = context.createGain();
  lfoGain.gain.value = p.vibratoDepth; // cents

  // Connect: LFO → osc detune (all oscs)
  lfo.connect(lfoGain);
  for (const osc of oscs) {
    lfoGain.connect(osc.detune);
  }

  // Connect: oscs → LPF → LPF2 → VCA → panner → outputGain → output
  for (const [, oscGain] of oscGains.entries()) {
    oscGain.connect(lpf);
  }
  lpf.connect(lpf2);
  lpf2.connect(vca);
  vca.connect(panner);
  panner.connect(outputGain);
  outputGain.connect(output);

  // Start oscillators (silent until noteOn)
  for (const osc of oscs) osc.start();
  lfo.start();

  return {
    setFrequency(hz: number) {
      const now = context.currentTime;
      for (const osc of oscs) {
        osc.frequency.setTargetAtTime(hz, now, 0.02); // 20ms glide
      }
    },

    setVolume(v: number) {
      outputGain.gain.setTargetAtTime(v, context.currentTime, 0.05);
    },

    setPan(pan: number) {
      panner.pan.setTargetAtTime(pan, context.currentTime, 0.05);
    },

    setBrightness(b: number) {
      const cutoff = 400 + b * 3600;
      lpf.frequency.setTargetAtTime(cutoff, context.currentTime, 0.1);
      lpf2.frequency.setTargetAtTime(cutoff * 1.2, context.currentTime, 0.1);
    },

    noteOn() {
      active = true;
      const now = context.currentTime;
      vca.gain.cancelScheduledValues(now);
      vca.gain.setValueAtTime(vca.gain.value, now);
      vca.gain.linearRampToValueAtTime(1, now + p.attack);
    },

    noteOff() {
      active = false;
      const now = context.currentTime;
      vca.gain.cancelScheduledValues(now);
      vca.gain.setValueAtTime(vca.gain.value, now);
      vca.gain.linearRampToValueAtTime(0, now + p.release);
    },

    isActive: () => active,

    destroy() {
      active = false;
      for (const osc of oscs) { try { osc.stop(); osc.disconnect(); } catch { /* */ } }
      try { lfo.stop(); lfo.disconnect(); } catch { /* */ }
      for (const g of oscGains) g.disconnect();
      lpf.disconnect();
      lpf2.disconnect();
      vca.disconnect();
      panner.disconnect();
      outputGain.disconnect();
    },
  };
}

/**
 * String Ensemble — manages multiple string voices that follow harmony.
 */
export interface StringEnsemble {
  /** Update all voices with new frequencies. Pass null to silence a voice. */
  update: (frequencies: (number | null)[]) => void;
  /** Master volume for entire string section. */
  setVolume: (v: number) => void;
  /** Brightness (LPF cutoff) for entire section. */
  setBrightness: (b: number) => void;
  /** Attack time. */
  setAttack: (s: number) => void;
  /** Enable/disable the entire ensemble. */
  setEnabled: (enabled: boolean) => void;
  /** Is ensemble enabled? */
  isEnabled: () => boolean;
  /** Clean up. */
  destroy: () => void;
}

const MAX_STRING_VOICES = 6; // up to 6-voice string section

export function createStringEnsemble(
  context: AudioContext,
  destination: AudioNode,
): StringEnsemble {
  let enabled = false;
  let brightness = 0.5;
  let attack = 0.2;
  let release = 0.4;

  // Master gain for ensemble
  const masterGain = context.createGain();
  masterGain.gain.value = 0; // starts muted
  masterGain.connect(destination);

  // Voice pool
  const voices: (StringVoice | null)[] = new Array(MAX_STRING_VOICES).fill(null);
  const voiceFreqs: (number | null)[] = new Array(MAX_STRING_VOICES).fill(null);

  // Panning spread for voices
  const PAN_SPREAD = [-0.6, 0.6, -0.3, 0.3, -0.1, 0.1];

  function ensureVoice(index: number): StringVoice {
    let voice = voices[index];
    if (!voice) {
      voice = createStringVoice(context, masterGain, {
        brightness,
        attack,
        release,
        pan: PAN_SPREAD[index] ?? 0,
      });
      voices[index] = voice;
    }
    return voice;
  }

  return {
    update(frequencies: (number | null)[]) {
      if (!enabled) return;

      for (let i = 0; i < MAX_STRING_VOICES; i++) {
        const targetFreq = frequencies[i] ?? null;
        const currentFreq = voiceFreqs[i];

        if (targetFreq && targetFreq > 0) {
          const voice = ensureVoice(i);

          // New note or frequency change
          if (!currentFreq || Math.abs(targetFreq - currentFreq) > 2) {
            voice.setFrequency(targetFreq);
            if (!voice.isActive()) {
              voice.noteOn();
            }
          }
          voiceFreqs[i] = targetFreq;
        } else {
          // Silence this voice
          const voice = voices[i];
          if (voice && voice.isActive()) {
            voice.noteOff();
          }
          voiceFreqs[i] = null;
        }
      }
    },

    setVolume(v: number) {
      masterGain.gain.setTargetAtTime(v, context.currentTime, 0.05);
    },

    setBrightness(b: number) {
      brightness = b;
      for (const voice of voices) {
        if (voice) voice.setBrightness(b);
      }
    },

    setAttack(s: number) {
      attack = s;
    },

    setEnabled(e: boolean) {
      enabled = e;
      if (e) {
        masterGain.gain.setTargetAtTime(0.6, context.currentTime, 0.1);
      } else {
        masterGain.gain.setTargetAtTime(0, context.currentTime, 0.2);
        // Note off all voices
        for (const voice of voices) {
          if (voice && voice.isActive()) voice.noteOff();
        }
      }
    },

    isEnabled: () => enabled,

    destroy() {
      enabled = false;
      for (const voice of voices) {
        if (voice) voice.destroy();
      }
      voices.fill(null);
      masterGain.disconnect();
    },
  };
}
