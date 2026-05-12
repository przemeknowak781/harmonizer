/**
 * Style presets — opinionated combinations of harmony mode, key, voices,
 * effects, and smoothing that recreate the harmonic palette of a particular
 * song/genre with one click.
 *
 * Each style is a self-contained recipe applied via `applyStyle()`, which
 * merges all relevant fields into the Zustand store in a single update.
 *
 * Research notes (per style):
 *
 *  - Wellerman (Nathan Evans, sea-shanty revival, 2020):
 *      Most-covered key is A natural-minor. Core progression i–III–VII–VI
 *      (Am–C–G–F) sung as call-and-response. Stack: lead + M3 + P5 + oct↑
 *      with a sub-octave bass voice — that's the “crew shouts back” feel.
 *
 *  - Queen (Bohemian Rhapsody / Somebody to Love stacked overdubs):
 *      Lush close-voiced major harmonies stacked in 3rds, 5ths and oct↑,
 *      often with a sub-oct rumble for the rock-anthem bottom. Brightness
 *      from short slapback + big plate. Cinematic strings layered.
 *
 *  - Fleetwood Mac (Rumours-era Buckingham/Nicks duets):
 *      Two-voice close harmony in M3 + M6, mid-pan, plate reverb with
 *      a quarter-note slapback. Lazy/legato vibe — long portamento.
 *
 *  - Gregorian organum (parallel fifths/fourths over a drone):
 *      Pure-interval harmony, monastic. Circle-of-Fifths mode gives
 *      Pythagorean fifths; mirror voicing produces medieval organum.
 *      Huge cathedral reverb + extreme legato.
 *
 *  - Beach Boys (Good Vibrations / God Only Knows):
 *      I–vi–IV–V doo-wop major triad stack with wide stereo image.
 *      Bright plate, no delay. Stagger rhythm = "ooh-ahh" feel.
 *
 *  - Auto-Trap (post-2010 T-Pain/Travis Scott):
 *      Autotune mode locked to A-minor pentatonic-feel chord vamp,
 *      single doubled voice with octave up, eighth-note delay + big
 *      hall for the dreamy/atmospheric vibe.
 */

import { buildProgression } from "./progressions";
import { useHarmonizerStore, type VoiceState } from "../stores/harmonizer-store";
import type {
  HarmonyPresetName,
  KeySignature,
} from "../types/music";

type HarmonyMode = "interval" | "chord" | "fifths" | "geometric" | "adaptive" | "autotune";

export interface StyleVoice {
  active: boolean;
  volume: number;
  pan: number;
  octaveShift: number;
  /** Steps on the Circle of Fifths — only used in `fifths` mode. */
  cofSteps?: number;
  cofOctaveReduce?: boolean;
}

export interface Style {
  id: string;
  label: string;
  description: string;
  harmonyMode: HarmonyMode;
  key?: KeySignature;
  presetName?: HarmonyPresetName;
  cofPresetName?: string;
  /** Diatonic-degree progression (0 = I, 5 = vi, etc.) applied in `chord`/`geometric` modes. */
  progression?: { degrees: number[]; beatsPerChord: number };
  rhythmPattern?: string;
  bpm?: number;
  voices: StyleVoice[];
  effects?: {
    reverbMix?: number;
    delayTime?: number;
    delayFeedback?: number;
    delayMix?: number;
  };
  smoothing?: {
    portamentoEnabled?: boolean;
    portamentoMs?: number;
    fadeEnabled?: boolean;
    fadeMs?: number;
  };
  dryVolume?: number;
}

function v(volume: number, pan: number, octaveShift = 0, cofSteps = 0, cofOctaveReduce = false): StyleVoice {
  return { active: true, volume, pan, octaveShift, cofSteps, cofOctaveReduce };
}

const SILENT: StyleVoice = { active: false, volume: 0, pan: 0, octaveShift: 0, cofSteps: 0, cofOctaveReduce: false };

export const STYLES: Style[] = [
  {
    id: "wellerman",
    label: "Wellerman",
    description: "Sea-shanty stack — Am call-and-response with full crew",
    harmonyMode: "chord",
    key: { root: "A", mode: "natural-minor" },
    presetName: "choir",
    progression: { degrees: [0, 2, 6, 5], beatsPerChord: 4 }, // i-III-VII-VI = Am-C-G-F
    rhythmPattern: "simultaneous",
    bpm: 100,
    // Lead M3↑, P5↑, oct↑, sub-oct
    voices: [v(0.7, -0.4, 0), v(0.65, 0.4, 0), v(0.55, -0.15, 1), v(0.7, 0.15, -1)],
    effects: { reverbMix: 0.45, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    smoothing: { portamentoEnabled: true, portamentoMs: 50, fadeEnabled: true, fadeMs: 80 },
    dryVolume: 0.9,
  },
  {
    id: "queen",
    label: "Queen",
    description: "Stacked overdubs — operatic close-voiced major + slapback",
    harmonyMode: "chord",
    key: { root: "G", mode: "major" },
    presetName: "choir",
    progression: { degrees: [0, 5, 3, 4], beatsPerChord: 4 }, // I-vi-IV-V
    rhythmPattern: "simultaneous",
    bpm: 130,
    voices: [v(0.75, -0.5, 0), v(0.7, 0.5, 0), v(0.6, 0, 1), v(0.6, 0, -1)],
    effects: { reverbMix: 0.55, delayTime: 30, delayFeedback: 0.15, delayMix: 0.2 },
    smoothing: { portamentoEnabled: true, portamentoMs: 40, fadeEnabled: true, fadeMs: 60 },
    dryVolume: 0.9,
  },
  {
    id: "fleetwood",
    label: "Fleetwood Mac",
    description: "Soft 70s duet — M3 + M6, plate + quarter-note slapback",
    harmonyMode: "chord",
    key: { root: "G", mode: "major" },
    presetName: "sixths",
    progression: { degrees: [0, 4, 5, 3], beatsPerChord: 4 }, // I-V-vi-IV
    rhythmPattern: "simultaneous",
    bpm: 110,
    voices: [v(0.75, -0.35, 0), v(0.7, 0.35, 0), SILENT, SILENT],
    effects: { reverbMix: 0.4, delayTime: 280, delayFeedback: 0.18, delayMix: 0.22 },
    smoothing: { portamentoEnabled: true, portamentoMs: 90, fadeEnabled: true, fadeMs: 120 },
    dryVolume: 0.95,
  },
  {
    id: "gregorian",
    label: "Gregorian",
    description: "Medieval organum — parallel fifths in a cathedral",
    harmonyMode: "fifths",
    cofPresetName: "mirror",
    rhythmPattern: "simultaneous",
    bpm: 60,
    // Fifths uses CoF steps; oct down on the bass for the drone weight.
    voices: [
      v(0.8, -0.4, 0, 1, false),    // P5 ↑
      v(0.8, 0.4, 0, -1, false),    // P4 ↓ (= P5 down)
      v(0.65, 0, -1, 0, false),     // root oct down (drone)
      SILENT,
    ],
    effects: { reverbMix: 0.85, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    smoothing: { portamentoEnabled: true, portamentoMs: 220, fadeEnabled: true, fadeMs: 250 },
    dryVolume: 0.85,
  },
  {
    id: "beach-boys",
    label: "Beach Boys",
    description: "Doo-wop major triad — wide stereo, bright plate",
    harmonyMode: "chord",
    key: { root: "C", mode: "major" },
    presetName: "open-voicing",
    progression: { degrees: [0, 5, 3, 4], beatsPerChord: 4 }, // I-vi-IV-V (50s)
    rhythmPattern: "stagger",
    bpm: 120,
    voices: [v(0.7, -0.55, 0), v(0.7, 0.55, 0), v(0.6, 0, 1), SILENT],
    effects: { reverbMix: 0.35, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    smoothing: { portamentoEnabled: true, portamentoMs: 60, fadeEnabled: true, fadeMs: 80 },
    dryVolume: 0.95,
  },
  {
    id: "auto-trap",
    label: "Auto-Trap",
    description: "Modern autotune — locked vamp + spacey delay",
    harmonyMode: "autotune",
    key: { root: "A", mode: "natural-minor" },
    progression: { degrees: [5, 3, 0, 4], beatsPerChord: 4 }, // vi-IV-I-V relative — but autotune just uses scale
    rhythmPattern: "simultaneous",
    bpm: 140,
    voices: [v(0.85, 0, 0), v(0.55, 0, 1), SILENT, SILENT],
    effects: { reverbMix: 0.4, delayTime: 214, delayFeedback: 0.35, delayMix: 0.3 }, // ~1/8 @ 140 bpm
    smoothing: { portamentoEnabled: false, portamentoMs: 30, fadeEnabled: true, fadeMs: 30 },
    dryVolume: 0.85,
  },
];

/**
 * Apply a style to the global store in a single update. Caller should
 * invoke the pipeline `syncSettings()` afterwards so the audio side
 * picks up the new effect / voice / smoothing values.
 */
export function applyStyle(style: Style): void {
  const newVoices: VoiceState[] = [];
  for (let i = 0; i < 4; i++) {
    const sv = style.voices[i];
    if (sv) {
      newVoices.push({
        active: sv.active,
        volume: sv.volume,
        pan: sv.pan,
        octaveShift: sv.octaveShift,
        cofSteps: sv.cofSteps ?? 0,
        cofOctaveReduce: sv.cofOctaveReduce ?? false,
      });
    } else {
      newVoices.push({ active: false, volume: 0, pan: 0, octaveShift: 0, cofSteps: 0, cofOctaveReduce: false });
    }
  }

  const updates: Partial<ReturnType<typeof useHarmonizerStore.getState>> = {
    harmonyMode: style.harmonyMode,
    voiceStates: newVoices,
  };

  if (style.key) updates.key = style.key;
  if (style.presetName) updates.presetName = style.presetName;
  if (style.cofPresetName) updates.cofPresetName = style.cofPresetName;
  if (style.rhythmPattern) updates.rhythmPattern = style.rhythmPattern;
  if (style.bpm !== undefined) updates.bpm = style.bpm;
  if (style.dryVolume !== undefined) updates.dryVolume = style.dryVolume;

  if (style.effects) {
    if (style.effects.reverbMix !== undefined) updates.reverbMix = style.effects.reverbMix;
    if (style.effects.delayTime !== undefined) updates.delayTime = style.effects.delayTime;
    if (style.effects.delayFeedback !== undefined) updates.delayFeedback = style.effects.delayFeedback;
    if (style.effects.delayMix !== undefined) updates.delayMix = style.effects.delayMix;
  }

  if (style.smoothing) {
    if (style.smoothing.portamentoEnabled !== undefined) updates.portamentoEnabled = style.smoothing.portamentoEnabled;
    if (style.smoothing.portamentoMs !== undefined) updates.portamentoTimeMs = style.smoothing.portamentoMs;
    if (style.smoothing.fadeEnabled !== undefined) updates.smoothFadeEnabled = style.smoothing.fadeEnabled;
    if (style.smoothing.fadeMs !== undefined) updates.fadeTimeMs = style.smoothing.fadeMs;
  }

  if (style.progression && style.key) {
    updates.activeProgression = buildProgression(
      style.key.root,
      style.key.mode,
      style.progression.degrees,
      style.progression.beatsPerChord,
    );
  }

  useHarmonizerStore.setState(updates);
}
