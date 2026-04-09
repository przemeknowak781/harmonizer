/**
 * Orchestra Ensemble — sample-based strings using smplr + Versilian VCSL
 *
 * Real instrument samples (violin, viola, cello, contrabass) loaded
 * on-demand from CDN. Each section plays harmony notes detected from
 * the singer's voice.
 *
 * Architecture:
 *   Singer pitch → harmony ratios → MIDI notes per section →
 *   Versilian sampler per instrument → mixer → output
 *
 * Voice assignments (classical orchestration):
 *   - Violin I:   melody (root) + highest harmony voice
 *   - Violin II:  2nd highest harmony voice
 *   - Viola:      middle harmony voice
 *   - Cello:      lower harmony voice (octave down if needed)
 *   - Contrabass:  root, 2 octaves down (foundation)
 */

import { Versilian } from "smplr";
import { frequencyToMidi } from "../engine/pitch";

/** Instrument section definition */
interface Section {
  name: string;
  instrumentName: string;
  sampler: Versilian | null;
  loaded: boolean;
  /** Octave offset from detected harmony note */
  octaveOffset: number;
  /** Default pan position */
  pan: number;
  /** Volume relative to master */
  volume: number;
  /** Current playing note (MIDI) */
  currentNote: number | null;
  /** Stop function for current note */
  stopFn: (() => void) | null;
}

export interface OrchestraConfig {
  enabled: boolean;
  masterVolume: number;  // 0-1
  sections: {
    violin1: boolean;
    violin2: boolean;
    viola: boolean;
    cello: boolean;
    contrabass: boolean;
  };
}

export const DEFAULT_ORCHESTRA_CONFIG: OrchestraConfig = {
  enabled: false,
  masterVolume: 0.5,
  sections: {
    violin1: true,
    violin2: true,
    viola: true,
    cello: true,
    contrabass: true,
  },
};

export interface Orchestra {
  /** Load instrument samples (call once, shows progress) */
  load: () => Promise<void>;
  /** Update with current harmony frequencies */
  update: (rootFreq: number, voiceRatios: number[]) => void;
  /** Silence all sections */
  silence: () => void;
  /** Set master volume */
  setVolume: (v: number) => void;
  /** Enable/disable entire orchestra */
  setEnabled: (e: boolean) => void;
  /** Enable/disable individual section */
  setSectionEnabled: (section: string, enabled: boolean) => void;
  /** Is loaded? */
  isLoaded: () => boolean;
  /** Is enabled? */
  isEnabled: () => boolean;
  /** Loading progress 0-1 */
  getProgress: () => number;
  /** Destroy */
  destroy: () => void;
}

/** Versilian instrument names for orchestral strings */
const INSTRUMENT_MAP: Record<string, string> = {
  violin1: "Chordophones/Bowed Chordophones/Violin 1 - Sustain",
  violin2: "Chordophones/Bowed Chordophones/Violin 1 - Sustain",
  viola: "Chordophones/Bowed Chordophones/Viola - Sustain",
  cello: "Chordophones/Bowed Chordophones/Cello - Sustain",
  contrabass: "Chordophones/Bowed Chordophones/Contrabass - Sustain",
};

/** Fallback: if exact VCSL names fail, use simpler ones */
const FALLBACK_MAP: Record<string, string> = {
  violin1: "Violin 1 - Sustain",
  violin2: "Violin 1 - Sustain",
  viola: "Viola - Sustain",
  cello: "Cello - Sustain",
  contrabass: "Contrabass - Sustain",
};

export function createOrchestra(
  context: AudioContext,
  destination: AudioNode,
): Orchestra {
  let enabled = false;
  let loaded = false;
  let progress = 0;

  // Master gain
  const masterGain = context.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(destination);

  // Sections
  const sections: Section[] = [
    { name: "violin1", instrumentName: INSTRUMENT_MAP.violin1!, sampler: null, loaded: false, octaveOffset: 0, pan: -0.5, volume: 0.7, currentNote: null, stopFn: null },
    { name: "violin2", instrumentName: INSTRUMENT_MAP.violin2!, sampler: null, loaded: false, octaveOffset: 0, pan: -0.2, volume: 0.6, currentNote: null, stopFn: null },
    { name: "viola",   instrumentName: INSTRUMENT_MAP.viola!,   sampler: null, loaded: false, octaveOffset: -1, pan: 0.2, volume: 0.55, currentNote: null, stopFn: null },
    { name: "cello",   instrumentName: INSTRUMENT_MAP.cello!,   sampler: null, loaded: false, octaveOffset: -1, pan: 0.4, volume: 0.6, currentNote: null, stopFn: null },
    { name: "contrabass", instrumentName: INSTRUMENT_MAP.contrabass!, sampler: null, loaded: false, octaveOffset: -2, pan: 0, volume: 0.5, currentNote: null, stopFn: null },
  ];

  const sectionEnabled: Record<string, boolean> = {
    violin1: true, violin2: true, viola: true, cello: true, contrabass: true,
  };

  async function loadSection(section: Section): Promise<void> {
    try {
      const sampler = new Versilian(context, {
        instrument: section.instrumentName,
      });
      await sampler.load;
      section.sampler = sampler;
      section.loaded = true;
    } catch {
      // Try fallback name
      try {
        const fallbackName = FALLBACK_MAP[section.name];
        if (fallbackName) {
          const sampler = new Versilian(context, {
            instrument: fallbackName,
          });
          await sampler.load;
          section.sampler = sampler;
          section.loaded = true;
        }
      } catch {
        console.warn(`Orchestra: failed to load ${section.name}`);
      }
    }
  }

  /** Convert frequency to nearest MIDI note number */
  function freqToMidi(freq: number): number {
    return Math.round(frequencyToMidi(freq));
  }

  /** Assign harmony notes to sections following orchestral conventions */
  function assignNotes(rootFreq: number, ratios: number[]): (number | null)[] {
    const rootMidi = freqToMidi(rootFreq);
    const harmonyMidis = ratios
      .filter(r => Math.abs(r - 1) > 0.01)
      .map(r => freqToMidi(rootFreq * r))
      .sort((a, b) => b - a); // highest first

    const notes: (number | null)[] = [];

    // Violin I: highest harmony note or root
    notes.push(harmonyMidis[0] ?? rootMidi);

    // Violin II: second highest or 3rd above root
    notes.push(harmonyMidis[1] ?? rootMidi + 4);

    // Viola: middle voice, shifted down an octave
    const violaNote = harmonyMidis[2] ?? harmonyMidis[1] ?? rootMidi;
    notes.push(violaNote - 12);

    // Cello: lower voice, octave down
    const celloNote = harmonyMidis[harmonyMidis.length - 1] ?? rootMidi;
    notes.push(celloNote - 12);

    // Contrabass: root, 2 octaves down
    notes.push(rootMidi - 24);

    return notes;
  }

  return {
    async load() {
      let loadedCount = 0;
      const total = sections.length;

      // Load all sections in parallel
      await Promise.all(
        sections.map(async (section) => {
          await loadSection(section);
          loadedCount++;
          progress = loadedCount / total;
        }),
      );

      loaded = sections.some(s => s.loaded);
    },

    update(rootFreq: number, voiceRatios: number[]) {
      if (!enabled || !loaded) return;

      const notes = assignNotes(rootFreq, voiceRatios);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]!;
        const targetNote = notes[i] ?? null;

        // Skip disabled sections
        if (!sectionEnabled[section.name]) {
          if (section.stopFn) { section.stopFn(); section.stopFn = null; section.currentNote = null; }
          continue;
        }

        if (!section.sampler || !section.loaded) continue;

        // Clamp to playable range
        const clampedNote = targetNote !== null
          ? Math.max(24, Math.min(96, targetNote)) // C1 to C7
          : null;

        if (clampedNote === null) {
          // Silence
          if (section.stopFn) { section.stopFn(); section.stopFn = null; section.currentNote = null; }
          continue;
        }

        // Only re-trigger if note changed (avoid retriggering same note)
        if (section.currentNote !== null && Math.abs(section.currentNote - clampedNote) < 1) {
          continue;
        }

        // Stop previous note
        if (section.stopFn) {
          section.stopFn();
        }

        // Play new note
        try {
          const stop = section.sampler.start({
            note: clampedNote,
            velocity: Math.round(section.volume * 100),
          });
          section.stopFn = stop;
          section.currentNote = clampedNote;
        } catch {
          // Sample might not exist for this note
        }
      }
    },

    silence() {
      for (const section of sections) {
        if (section.stopFn) {
          section.stopFn();
          section.stopFn = null;
          section.currentNote = null;
        }
      }
    },

    setVolume(v: number) {
      masterGain.gain.setTargetAtTime(v, context.currentTime, 0.05);
    },

    setEnabled(e: boolean) {
      enabled = e;
      if (e && loaded) {
        masterGain.gain.setTargetAtTime(0.5, context.currentTime, 0.1);
      } else {
        masterGain.gain.setTargetAtTime(0, context.currentTime, 0.2);
        // Silence all
        for (const section of sections) {
          if (section.stopFn) { section.stopFn(); section.stopFn = null; section.currentNote = null; }
        }
      }
    },

    setSectionEnabled(sectionName: string, e: boolean) {
      sectionEnabled[sectionName] = e;
      if (!e) {
        const section = sections.find(s => s.name === sectionName);
        if (section?.stopFn) { section.stopFn(); section.stopFn = null; section.currentNote = null; }
      }
    },

    isLoaded: () => loaded,
    isEnabled: () => enabled,
    getProgress: () => progress,
    destroy() {
      enabled = false;
      for (const section of sections) {
        if (section.stopFn) section.stopFn();
        if (section.sampler) section.sampler.disconnect();
      }
      masterGain.disconnect();
    },
  };
}
