/**
 * Orchestra Ensemble v3 — Rich orchestral arrangement engine
 *
 * Uses smplr Soundfont (GM) with multiple articulations:
 * - Sustain (violin, viola, cello, contrabass) — legato lines
 * - Tremolo strings — dramatic effect, tension
 * - Pizzicato strings — rhythmic pulse, staccato
 * - String ensemble — pad/fill
 *
 * Arrangement patterns (selectable):
 * - Sustained: all voices hold notes (chorale)
 * - Arpeggiated: notes cycle through voices sequentially
 * - Tremolo+sustain: upper strings tremolo, lower sustain
 * - Pizzicato pulse: rhythmic pizz with sustained cello/bass
 * - Cinematic: dynamic swells with layered articulations
 *
 * Voice leading: smooth transitions, contrary motion, avoid leaps > octave
 */

import { Soundfont } from "smplr";
import { frequencyToMidi } from "../engine/pitch";

type ArticulationType = "sustain" | "tremolo" | "pizzicato" | "ensemble";

interface OrchestraVoice {
  name: string;
  articulation: ArticulationType;
  instrumentName: string;
  sampler: Soundfont | null;
  gain: GainNode | null;
  loaded: boolean;
  baseVolume: number;
  pan: number;
  currentNote: number | null;
  stopFn: (() => void) | null;
  enabled: boolean;
}

export type ArrangementPattern =
  | "sustained"
  | "arpeggiated"
  | "tremolo-drama"
  | "pizz-pulse"
  | "cinematic";

export interface Orchestra {
  load: () => Promise<void>;
  update: (rootFreq: number, voiceRatios: number[]) => void;
  silence: () => void;
  setVolume: (v: number) => void;
  setEnabled: (e: boolean) => void;
  setPattern: (p: ArrangementPattern) => void;
  setSectionEnabled: (section: string, enabled: boolean) => void;
  isLoaded: () => boolean;
  isEnabled: () => boolean;
  getProgress: () => number;
  getPattern: () => ArrangementPattern;
  destroy: () => void;
}

const INSTRUMENT_MAP: Record<ArticulationType, string> = {
  sustain: "violin",      // individual instruments override per voice
  tremolo: "tremolo_strings",
  pizzicato: "pizzicato_strings",
  ensemble: "string_ensemble_1",
};

export function createOrchestra(
  context: AudioContext,
  destination: AudioNode,
): Orchestra {
  let enabled = false;
  let loaded = false;
  let progress = 0;
  let masterVol = 0.5;
  let pattern: ArrangementPattern = "cinematic";
  let beatCounter = 0; // for arpeggiation timing

  // All orchestral voices — loaded as pool
  const voices: OrchestraVoice[] = [
    // Sustain section
    { name: "violin1",  articulation: "sustain", instrumentName: "violin",     sampler: null, gain: null, loaded: false, baseVolume: 0.55, pan: -0.5, currentNote: null, stopFn: null, enabled: true },
    { name: "violin2",  articulation: "sustain", instrumentName: "violin",     sampler: null, gain: null, loaded: false, baseVolume: 0.45, pan: -0.15,currentNote: null, stopFn: null, enabled: true },
    { name: "viola",    articulation: "sustain", instrumentName: "viola",      sampler: null, gain: null, loaded: false, baseVolume: 0.45, pan: 0.15, currentNote: null, stopFn: null, enabled: true },
    { name: "cello",    articulation: "sustain", instrumentName: "cello",      sampler: null, gain: null, loaded: false, baseVolume: 0.5,  pan: 0.4,  currentNote: null, stopFn: null, enabled: true },
    { name: "bass",     articulation: "sustain", instrumentName: "contrabass", sampler: null, gain: null, loaded: false, baseVolume: 0.4,  pan: 0,    currentNote: null, stopFn: null, enabled: true },
    // Tremolo layer
    { name: "trem-hi",  articulation: "tremolo", instrumentName: "tremolo_strings", sampler: null, gain: null, loaded: false, baseVolume: 0.35, pan: -0.3, currentNote: null, stopFn: null, enabled: true },
    { name: "trem-lo",  articulation: "tremolo", instrumentName: "tremolo_strings", sampler: null, gain: null, loaded: false, baseVolume: 0.3,  pan: 0.3,  currentNote: null, stopFn: null, enabled: true },
    // Pizzicato layer
    { name: "pizz",     articulation: "pizzicato", instrumentName: "pizzicato_strings", sampler: null, gain: null, loaded: false, baseVolume: 0.5, pan: 0, currentNote: null, stopFn: null, enabled: true },
    // Ensemble pad
    { name: "pad",      articulation: "ensemble", instrumentName: "string_ensemble_1", sampler: null, gain: null, loaded: false, baseVolume: 0.25, pan: 0, currentNote: null, stopFn: null, enabled: true },
  ];

  const sectionEnabled: Record<string, boolean> = {};
  for (const v of voices) sectionEnabled[v.name] = true;

  async function loadVoice(voice: OrchestraVoice): Promise<void> {
    try {
      const gain = context.createGain();
      gain.gain.value = 0; // start muted
      gain.connect(destination);
      voice.gain = gain;

      const sampler = new Soundfont(context, {
        instrument: voice.instrumentName,
        destination: gain,
      });
      await sampler.load;
      voice.sampler = sampler;
      voice.loaded = true;
    } catch (e) {
      console.warn(`Orchestra: failed to load ${voice.name}:`, e);
    }
  }

  function stopVoice(voice: OrchestraVoice) {
    if (voice.stopFn) { voice.stopFn(); voice.stopFn = null; }
    voice.currentNote = null;
  }

  function playVoice(voice: OrchestraVoice, midi: number, velocity = 80) {
    if (!voice.sampler || !voice.loaded || !voice.enabled) return;
    if (!sectionEnabled[voice.name]) return;

    const note = Math.max(28, Math.min(96, midi));
    if (voice.currentNote !== null && Math.abs(voice.currentNote - note) < 1) return;

    stopVoice(voice);
    try {
      const stop = voice.sampler.start({ note, velocity });
      voice.stopFn = stop;
      voice.currentNote = note;
    } catch { /* sample might not exist */ }
  }

  function setVoiceGain(voice: OrchestraVoice, vol: number) {
    if (voice.gain) {
      voice.gain.gain.setTargetAtTime(vol * masterVol, context.currentTime, 0.08);
    }
  }

  function freqToMidi(freq: number): number {
    return Math.round(frequencyToMidi(freq));
  }

  /** Build chord notes from root + ratios */
  function buildChord(rootFreq: number, ratios: number[]): number[] {
    const rootMidi = freqToMidi(rootFreq);
    const notes = [rootMidi];
    for (const r of ratios) {
      if (Math.abs(r - 1) > 0.01) {
        notes.push(freqToMidi(rootFreq * r));
      }
    }
    return notes.sort((a, b) => a - b);
  }

  // ═══ Arrangement Patterns ═══

  function arrangeSustained(chord: number[]) {
    const root = chord[0] ?? 60;
    const top = chord[chord.length - 1] ?? root;
    const mid = chord[Math.floor(chord.length / 2)] ?? root;
    const low = chord[1] ?? root;

    // Sustain voices
    playVoice(voices[0]!, top);         setVoiceGain(voices[0]!, 0.55);  // violin1 = top
    playVoice(voices[1]!, mid + 7);     setVoiceGain(voices[1]!, 0.45);  // violin2 = mid+5th
    playVoice(voices[2]!, mid);         setVoiceGain(voices[2]!, 0.4);   // viola = middle
    playVoice(voices[3]!, low - 12);    setVoiceGain(voices[3]!, 0.5);   // cello = octave below
    playVoice(voices[4]!, root - 24);   setVoiceGain(voices[4]!, 0.4);   // bass = 2 oct below

    // Ensemble pad on root
    playVoice(voices[8]!, root);        setVoiceGain(voices[8]!, 0.2);

    // Mute tremolo and pizz
    setVoiceGain(voices[5]!, 0);
    setVoiceGain(voices[6]!, 0);
    setVoiceGain(voices[7]!, 0);
  }

  function arrangeArpeggiated(chord: number[]) {
    beatCounter++;
    const idx = beatCounter % chord.length;
    const arpeggioNote = chord[idx] ?? chord[0] ?? 60;
    const root = chord[0] ?? 60;

    // Pizz plays arpeggiated note
    playVoice(voices[7]!, arpeggioNote); setVoiceGain(voices[7]!, 0.55);

    // Sustain holds root + 5th
    playVoice(voices[3]!, root - 12);    setVoiceGain(voices[3]!, 0.4);
    playVoice(voices[4]!, root - 24);    setVoiceGain(voices[4]!, 0.35);

    // Light pad
    playVoice(voices[8]!, root);         setVoiceGain(voices[8]!, 0.15);

    // Mute others
    setVoiceGain(voices[0]!, 0);
    setVoiceGain(voices[1]!, 0);
    setVoiceGain(voices[2]!, 0);
    setVoiceGain(voices[5]!, 0);
    setVoiceGain(voices[6]!, 0);
  }

  function arrangeTremoloDrama(chord: number[]) {
    const root = chord[0] ?? 60;
    const top = chord[chord.length - 1] ?? root;
    const mid = chord[Math.floor(chord.length / 2)] ?? root;

    // Tremolo on upper voices — dramatic
    playVoice(voices[5]!, top);          setVoiceGain(voices[5]!, 0.45);
    playVoice(voices[6]!, mid);          setVoiceGain(voices[6]!, 0.4);

    // Sustain on lower voices — foundation
    playVoice(voices[3]!, root - 12);    setVoiceGain(voices[3]!, 0.5);
    playVoice(voices[4]!, root - 24);    setVoiceGain(voices[4]!, 0.4);

    // Ensemble pad
    playVoice(voices[8]!, root);         setVoiceGain(voices[8]!, 0.2);

    // Mute individual sustain violins
    setVoiceGain(voices[0]!, 0);
    setVoiceGain(voices[1]!, 0);
    setVoiceGain(voices[2]!, 0);
    setVoiceGain(voices[7]!, 0);
  }

  function arrangePizzPulse(chord: number[]) {
    beatCounter++;
    const root = chord[0] ?? 60;
    const idx = beatCounter % Math.max(chord.length, 1);
    const pizzNote = chord[idx] ?? root;

    // Pizzicato on alternating chord tones
    playVoice(voices[7]!, pizzNote);     setVoiceGain(voices[7]!, 0.6);

    // Cello sustain
    playVoice(voices[3]!, root - 12);    setVoiceGain(voices[3]!, 0.45);
    playVoice(voices[4]!, root - 24);    setVoiceGain(voices[4]!, 0.35);

    // Mute rest
    setVoiceGain(voices[0]!, 0);
    setVoiceGain(voices[1]!, 0);
    setVoiceGain(voices[2]!, 0);
    setVoiceGain(voices[5]!, 0);
    setVoiceGain(voices[6]!, 0);
    setVoiceGain(voices[8]!, 0);
  }

  function arrangeCinematic(chord: number[]) {
    const root = chord[0] ?? 60;
    const top = chord[chord.length - 1] ?? root;
    const mid = chord[Math.floor(chord.length / 2)] ?? root;
    const low = chord.length > 1 ? (chord[1] ?? root) : root;

    // Full orchestral spread — every layer active at calibrated levels
    // Violins: melody + harmony, wide stereo
    playVoice(voices[0]!, top);          setVoiceGain(voices[0]!, 0.5);
    playVoice(voices[1]!, mid + 7);      setVoiceGain(voices[1]!, 0.35);

    // Viola: inner voice
    playVoice(voices[2]!, mid);          setVoiceGain(voices[2]!, 0.35);

    // Cello: warmth
    playVoice(voices[3]!, low - 12);     setVoiceGain(voices[3]!, 0.45);

    // Bass: foundation
    playVoice(voices[4]!, root - 24);    setVoiceGain(voices[4]!, 0.35);

    // Subtle tremolo on high note for shimmer
    playVoice(voices[5]!, top + 12);     setVoiceGain(voices[5]!, 0.15);

    // Light tremolo underneath
    playVoice(voices[6]!, mid - 12);     setVoiceGain(voices[6]!, 0.12);

    // Ensemble pad for body
    playVoice(voices[8]!, root);         setVoiceGain(voices[8]!, 0.18);

    // No pizz in cinematic sustained
    setVoiceGain(voices[7]!, 0);
  }

  return {
    async load() {
      let count = 0;
      await Promise.all(voices.map(async (v) => {
        await loadVoice(v);
        count++;
        progress = count / voices.length;
      }));
      loaded = voices.some(v => v.loaded);
      console.log(`Orchestra: ${voices.filter(v => v.loaded).length}/${voices.length} voices loaded`);
    },

    update(rootFreq: number, voiceRatios: number[]) {
      if (!enabled || !loaded) return;

      const chord = buildChord(rootFreq, voiceRatios);

      switch (pattern) {
        case "sustained":      arrangeSustained(chord); break;
        case "arpeggiated":    arrangeArpeggiated(chord); break;
        case "tremolo-drama":  arrangeTremoloDrama(chord); break;
        case "pizz-pulse":     arrangePizzPulse(chord); break;
        case "cinematic":      arrangeCinematic(chord); break;
      }
    },

    silence() {
      for (const v of voices) { stopVoice(v); setVoiceGain(v, 0); }
    },

    setVolume(v: number) {
      masterVol = v;
      // Update all active gains
      for (const voice of voices) {
        if (voice.gain && voice.currentNote !== null) {
          voice.gain.gain.setTargetAtTime(voice.baseVolume * masterVol, context.currentTime, 0.05);
        }
      }
    },

    setEnabled(e: boolean) {
      enabled = e;
      if (!e) {
        for (const v of voices) { stopVoice(v); setVoiceGain(v, 0); }
      }
    },

    setPattern(p: ArrangementPattern) {
      pattern = p;
      beatCounter = 0;
    },

    setSectionEnabled(name: string, e: boolean) {
      sectionEnabled[name] = e;
      if (!e) {
        const v = voices.find(v => v.name === name);
        if (v) { stopVoice(v); setVoiceGain(v, 0); }
      }
    },

    isLoaded: () => loaded,
    isEnabled: () => enabled,
    getProgress: () => progress,
    getPattern: () => pattern,

    destroy() {
      enabled = false;
      for (const v of voices) {
        stopVoice(v);
        if (v.sampler) v.sampler.disconnect();
        if (v.gain) v.gain.disconnect();
      }
    },
  };
}
