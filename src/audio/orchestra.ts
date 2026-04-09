/**
 * Orchestra Ensemble — sample-based strings via smplr Soundfont (General MIDI)
 *
 * Real instrument samples: violin, viola, cello, contrabass
 * Loaded on-demand from CDN (MusyngKite or FluidR3 soundfont).
 *
 * Voice assignment (classical orchestration):
 *   Violin I:   highest harmony voice (melody doubling)
 *   Violin II:  second harmony voice
 *   Viola:      middle voice, natural register
 *   Cello:      lower voice, octave below singer
 *   Contrabass: root, 2 octaves below (foundation)
 */

import { Soundfont } from "smplr";
import { frequencyToMidi } from "../engine/pitch";

interface SamplerSection {
  name: string;
  instrument: string;      // Soundfont GM name
  sampler: Soundfont | null;
  loaded: boolean;
  pan: number;
  volume: number;
  octaveOffset: number;
  currentNote: number | null;
  stopFn: (() => void) | null;
  enabled: boolean;
}

export interface Orchestra {
  load: () => Promise<void>;
  update: (rootFreq: number, voiceRatios: number[]) => void;
  silence: () => void;
  setVolume: (v: number) => void;
  setEnabled: (e: boolean) => void;
  setSectionEnabled: (section: string, enabled: boolean) => void;
  isLoaded: () => boolean;
  isEnabled: () => boolean;
  getProgress: () => number;
  destroy: () => void;
}

export function createOrchestra(
  context: AudioContext,
  destination: AudioNode,
): Orchestra {
  let enabled = false;
  let loaded = false;
  let progress = 0;
  let masterVol = 0.5;

  const sections: SamplerSection[] = [
    { name: "violin1",    instrument: "violin",     sampler: null, loaded: false, pan: -0.5, volume: 0.65, octaveOffset: 0,  currentNote: null, stopFn: null, enabled: true },
    { name: "violin2",    instrument: "violin",     sampler: null, loaded: false, pan: -0.15,volume: 0.55, octaveOffset: 0,  currentNote: null, stopFn: null, enabled: true },
    { name: "viola",      instrument: "viola",      sampler: null, loaded: false, pan: 0.15, volume: 0.5,  octaveOffset: 0,  currentNote: null, stopFn: null, enabled: true },
    { name: "cello",      instrument: "cello",      sampler: null, loaded: false, pan: 0.4,  volume: 0.55, octaveOffset: -1, currentNote: null, stopFn: null, enabled: true },
    { name: "contrabass",instrument: "contrabass", sampler: null, loaded: false, pan: 0,    volume: 0.45, octaveOffset: -2, currentNote: null, stopFn: null, enabled: true },
  ];

  async function loadSection(section: SamplerSection): Promise<void> {
    try {
      // Create sampler routed to our destination (effects chain), not default output
      const sampler = new Soundfont(context, {
        instrument: section.instrument,
        destination,
        volume: Math.round(section.volume * 127),
      });
      await sampler.load;
      section.sampler = sampler;
      section.loaded = true;
      console.log(`Orchestra: loaded ${section.name} (${section.instrument})`);
    } catch (e) {
      console.warn(`Orchestra: failed to load ${section.name}:`, e);
    }
  }

  function freqToMidi(freq: number): number {
    return Math.round(frequencyToMidi(freq));
  }

  /** Assign harmony notes to sections */
  function assignNotes(rootFreq: number, ratios: number[]): (number | null)[] {
    const rootMidi = freqToMidi(rootFreq);

    // Get harmony MIDI notes sorted high→low
    const harmonyMidis = ratios
      .filter(r => Math.abs(r - 1) > 0.01)
      .map(r => freqToMidi(rootFreq * r))
      .sort((a, b) => b - a);

    // Assign:
    // Violin I  = highest harmony or root+7 (fifth above)
    // Violin II = 2nd highest or root+4 (major third)
    // Viola     = middle or root (natural register)
    // Cello     = lowest or root, octave down
    // Bass      = root, 2 octaves down
    return [
      harmonyMidis[0] ?? rootMidi + 7,                                    // Violin I
      harmonyMidis[1] ?? (harmonyMidis[0] ? rootMidi + 4 : rootMidi),   // Violin II
      (harmonyMidis[2] ?? harmonyMidis[1] ?? rootMidi),                  // Viola
      (harmonyMidis[harmonyMidis.length - 1] ?? rootMidi) - 12,         // Cello
      rootMidi - 24,                                                      // Contrabass
    ];
  }

  function stopSection(section: SamplerSection) {
    if (section.stopFn) {
      section.stopFn();
      section.stopFn = null;
    }
    section.currentNote = null;
  }

  function playSection(section: SamplerSection, midi: number) {
    if (!section.sampler || !section.loaded || !section.enabled) return;

    // Clamp to playable range
    const note = Math.max(28, Math.min(96, midi)); // E1 to C7

    // Skip if same note
    if (section.currentNote !== null && Math.abs(section.currentNote - note) < 1) return;

    // Stop previous
    stopSection(section);

    try {
      const stop = section.sampler.start({
        note,
        velocity: Math.round(section.volume * masterVol * 127),
      });
      section.stopFn = stop;
      section.currentNote = note;
    } catch {
      // Sample might not exist for this note
    }
  }

  return {
    async load() {
      let count = 0;
      await Promise.all(sections.map(async (section) => {
        await loadSection(section);
        count++;
        progress = count / sections.length;
      }));
      loaded = sections.some(s => s.loaded);
    },

    update(rootFreq: number, voiceRatios: number[]) {
      if (!enabled || !loaded) return;

      const notes = assignNotes(rootFreq, voiceRatios);
      // Debug: log once every ~2s
      if (Math.random() < 0.02) {
        console.log("[orchestra]", { rootFreq: rootFreq.toFixed(0), notes, ratios: voiceRatios.length });
      }
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]!;
        const note = notes[i];
        if (!section.enabled || note === null || note === undefined) {
          stopSection(section);
          continue;
        }
        playSection(section, note);
      }
    },

    silence() {
      for (const section of sections) stopSection(section);
    },

    setVolume(v: number) {
      masterVol = v;
    },

    setEnabled(e: boolean) {
      enabled = e;
      if (!e) {
        for (const section of sections) stopSection(section);
      }
    },

    setSectionEnabled(name: string, e: boolean) {
      const section = sections.find(s => s.name === name);
      if (section) {
        section.enabled = e;
        if (!e) stopSection(section);
      }
    },

    isLoaded: () => loaded,
    isEnabled: () => enabled,
    getProgress: () => progress,

    destroy() {
      enabled = false;
      for (const section of sections) {
        stopSection(section);
        if (section.sampler) section.sampler.disconnect();
      }
    },
  };
}
