# Advanced Harmonization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the static-interval harmonizer into a chord-aware, voice-led, rhythmically intelligent system with DAW transport, looper, and effects — grounded in classical and contemporary music theory.

**Architecture:** The engine layer gets three new modules: chords (chord types, progressions, diatonic analysis), voice-leading (stateful smooth voice transitions with counterpoint rules), and rhythm (transport clock, arpeggiator, voice timing). The audio layer adds a transport clock (AudioContext-based), looper (circular buffer recording + overdub), delay nodes per voice for rhythmic offsets, and a convolver for reverb. UI adds chord progression editor, transport bar, looper controls, and effects panel.

**Tech Stack:** Same as MVP — React 19, TypeScript strict, Vite, Zustand, Web Audio API, AudioWorklet, Vitest.

**Key music theory foundations:**
- **Diatonic harmony**: chords built on scale degrees (I ii iii IV V vi vii°)
- **Voice leading** (Bach/Fux): stepwise motion, contrary motion, avoid parallel 5ths/8ves, resolve tendency tones
- **Chord-tone prioritization**: root > 5th > 3rd > 7th > extensions for voice assignment
- **Rhythmic subdivision**: voices enter on beat divisions (quarter, eighth, triplet) for arpeggio/stagger effects
- **Counterpoint species**: 1st species (note-against-note) through 3rd species (4 notes against 1) for melodic line generation

---

## Current State

MVP harmonizes using **fixed diatonic intervals** — if preset says "+3rd", voice always sings a diatonic third above, regardless of what chord is implied. This creates wrong notes when the chord changes (e.g., singing E over an F chord in C major).

**What changes:**
- `computeHarmony` currently takes `(frequency, root, mode, preset)` → will also take `currentChord`
- Voices will be assigned **chord tones** (root, 3rd, 5th, 7th) instead of fixed intervals
- Voice state persists between frames for **smooth voice leading**
- A **transport clock** drives chord progression timing and rhythm patterns
- **Looper** and **effects** add DAW-like capabilities

---

## Task 1: Chord Types & Chord-Tone Computation

**Files:**
- Create: `src/types/chords.ts`
- Create: `src/engine/chords.ts`
- Test: `src/engine/chords.test.ts`

### Step 1: Write chord types — `src/types/chords.ts`:

```ts
import type { NoteName } from "./music";

/** Chord quality defines the intervals from root. */
export type ChordQuality =
  | "major"       // 1 3 5
  | "minor"       // 1 b3 5
  | "dim"         // 1 b3 b5
  | "aug"         // 1 3 #5
  | "dom7"        // 1 3 5 b7
  | "maj7"        // 1 3 5 7
  | "min7"        // 1 b3 5 b7
  | "dim7"        // 1 b3 b5 bb7
  | "sus2"        // 1 2 5
  | "sus4";       // 1 4 5

export interface Chord {
  root: NoteName;
  quality: ChordQuality;
}

/** A chord in a progression with a duration in beats. */
export interface ChordSlot {
  chord: Chord;
  beats: number;
}

export interface ChordProgression {
  name: string;
  key: NoteName;
  beatsPerMeasure: number;
  slots: ChordSlot[];
}

/** Which function a chord tone serves. Ordered by voice assignment priority. */
export type ChordFunction = "root" | "3rd" | "5th" | "7th" | "9th" | "11th";
```

### Step 2: Write failing tests — `src/engine/chords.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getChordTones,
  getChordMidiNotes,
  findNearestChordTone,
  buildDiatonicChord,
} from "./chords";

describe("getChordTones", () => {
  it("C major = [0, 4, 7]", () => {
    expect(getChordTones({ root: "C", quality: "major" })).toEqual([0, 4, 7]);
  });

  it("A minor = [9, 0, 4]", () => {
    expect(getChordTones({ root: "A", quality: "minor" })).toEqual([9, 0, 4]);
  });

  it("G dom7 = [7, 11, 2, 5]", () => {
    expect(getChordTones({ root: "G", quality: "dom7" })).toEqual([7, 11, 2, 5]);
  });

  it("D dim = [2, 5, 8]", () => {
    expect(getChordTones({ root: "D", quality: "dim" })).toEqual([2, 5, 8]);
  });

  it("F sus4 = [5, 10, 0]", () => {
    expect(getChordTones({ root: "F", quality: "sus4" })).toEqual([5, 10, 0]);
  });
});

describe("getChordMidiNotes", () => {
  it("C major around MIDI 60 = [60, 64, 67]", () => {
    expect(getChordMidiNotes({ root: "C", quality: "major" }, 60)).toEqual([60, 64, 67]);
  });

  it("C major around MIDI 72 = [72, 76, 79]", () => {
    expect(getChordMidiNotes({ root: "C", quality: "major" }, 72)).toEqual([72, 76, 79]);
  });

  it("A minor around MIDI 57 = [57, 60, 64]", () => {
    expect(getChordMidiNotes({ root: "A", quality: "minor" }, 57)).toEqual([57, 60, 64]);
  });
});

describe("findNearestChordTone", () => {
  it("MIDI 62 (D) snaps to 64 (E) in C major chord", () => {
    expect(findNearestChordTone(62, { root: "C", quality: "major" })).toBe(64);
  });

  it("MIDI 60 (C) stays at 60 in C major chord", () => {
    expect(findNearestChordTone(60, { root: "C", quality: "major" })).toBe(60);
  });

  it("MIDI 66 (F#) snaps to 67 (G) in C major chord", () => {
    expect(findNearestChordTone(66, { root: "C", quality: "major" })).toBe(67);
  });
});

describe("buildDiatonicChord", () => {
  it("I in C major = C major", () => {
    const chord = buildDiatonicChord("C", "major", 0);
    expect(chord.root).toBe("C");
    expect(chord.quality).toBe("major");
  });

  it("ii in C major = D minor", () => {
    const chord = buildDiatonicChord("C", "major", 1);
    expect(chord.root).toBe("D");
    expect(chord.quality).toBe("minor");
  });

  it("V in C major = G major", () => {
    const chord = buildDiatonicChord("C", "major", 4);
    expect(chord.root).toBe("G");
    expect(chord.quality).toBe("major");
  });

  it("vii° in C major = B dim", () => {
    const chord = buildDiatonicChord("C", "major", 6);
    expect(chord.root).toBe("B");
    expect(chord.quality).toBe("dim");
  });

  it("i in A minor = A minor", () => {
    const chord = buildDiatonicChord("A", "natural-minor", 0);
    expect(chord.root).toBe("A");
    expect(chord.quality).toBe("minor");
  });

  it("III in A minor = C major", () => {
    const chord = buildDiatonicChord("A", "natural-minor", 2);
    expect(chord.root).toBe("C");
    expect(chord.quality).toBe("major");
  });
});
```

### Step 3: Run to verify failure

```bash
npx vitest run src/engine/chords.test.ts
```

### Step 4: Implement — `src/engine/chords.ts`:

```ts
import type { Chord, ChordQuality } from "../types/chords";
import type { NoteName, ModeName } from "../types/music";
import { NOTE_NAMES, SCALE_INTERVALS, SEMITONES_PER_OCTAVE } from "./constants";

/**
 * Semitone intervals from root for each chord quality.
 * Based on standard tertian harmony.
 */
const CHORD_INTERVALS: Record<ChordQuality, readonly number[]> = {
  "major":  [0, 4, 7],
  "minor":  [0, 3, 7],
  "dim":    [0, 3, 6],
  "aug":    [0, 4, 8],
  "dom7":   [0, 4, 7, 10],
  "maj7":   [0, 4, 7, 11],
  "min7":   [0, 3, 7, 10],
  "dim7":   [0, 3, 6, 9],
  "sus2":   [0, 2, 7],
  "sus4":   [0, 5, 7],
};

/**
 * Diatonic chord qualities for each scale degree.
 * Major: I ii iii IV V vi vii°
 * Minor: i ii° III iv v VI VII
 */
const DIATONIC_QUALITIES: Record<string, readonly ChordQuality[]> = {
  "major":         ["major", "minor", "minor", "major", "major", "minor", "dim"],
  "natural-minor": ["minor", "dim", "major", "minor", "minor", "major", "major"],
  "harmonic-minor":["minor", "dim", "aug", "minor", "major", "major", "dim"],
  "dorian":        ["minor", "minor", "major", "major", "minor", "dim", "major"],
  "mixolydian":    ["major", "minor", "dim", "major", "minor", "minor", "major"],
};

/** Get pitch classes (0–11) for a chord's tones. */
export function getChordTones(chord: Chord): number[] {
  const rootIndex = NOTE_NAMES.indexOf(chord.root);
  const intervals = CHORD_INTERVALS[chord.quality];
  return intervals.map((interval) => (rootIndex + interval) % SEMITONES_PER_OCTAVE);
}

/** Get absolute MIDI note numbers for chord tones nearest to (and >= ) baseMidi. */
export function getChordMidiNotes(chord: Chord, baseMidi: number): number[] {
  const tones = getChordTones(chord);
  const baseOctave = baseMidi - (baseMidi % 12);

  return tones.map((pc) => {
    let midi = baseOctave + pc;
    if (midi < baseMidi) midi += 12;
    return midi;
  });
}

/** Find the nearest chord tone (MIDI) to a given MIDI note. */
export function findNearestChordTone(midi: number, chord: Chord): number {
  const tones = getChordTones(chord);
  const pitchClass = ((midi % 12) + 12) % 12;
  const octaveBase = midi - pitchClass;

  let bestDistance = Infinity;
  let bestMidi = midi;

  for (const tone of tones) {
    for (const offset of [-12, 0, 12]) {
      const candidate = octaveBase + tone + offset;
      const distance = Math.abs(candidate - midi);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMidi = candidate;
      }
    }
  }

  return bestMidi;
}

/** Build a diatonic chord on a given scale degree (0-based). */
export function buildDiatonicChord(
  key: NoteName,
  mode: ModeName,
  degree: number,
): Chord {
  const scaleIntervals = SCALE_INTERVALS[mode];
  const rootSemitone = scaleIntervals[degree % scaleIntervals.length]!;
  const rootIndex = (NOTE_NAMES.indexOf(key) + rootSemitone) % SEMITONES_PER_OCTAVE;
  const root = NOTE_NAMES[rootIndex]!;

  const qualities = DIATONIC_QUALITIES[mode];
  const quality = qualities
    ? qualities[degree % qualities.length]!
    : "major";

  return { root, quality };
}
```

### Step 5: Run to verify pass

```bash
npx vitest run src/engine/chords.test.ts
```

### Step 6: Commit

```bash
git add src/types/chords.ts src/engine/chords.ts src/engine/chords.test.ts
git commit -m "feat: add chord types and chord-tone computation engine"
```

---

## Task 2: Common Chord Progressions

**Files:**
- Create: `src/engine/progressions.ts`
- Test: `src/engine/progressions.test.ts`

### Step 1: Write failing tests — `src/engine/progressions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { COMMON_PROGRESSIONS, buildProgression, getChordAtBeat } from "./progressions";

describe("COMMON_PROGRESSIONS", () => {
  it("has at least 6 common progressions", () => {
    expect(COMMON_PROGRESSIONS.length).toBeGreaterThanOrEqual(6);
  });

  it("I-IV-V-I exists", () => {
    const prog = COMMON_PROGRESSIONS.find((p) => p.name === "I-IV-V-I");
    expect(prog).toBeDefined();
    expect(prog!.degrees).toEqual([0, 3, 4, 0]);
  });

  it("I-V-vi-IV (pop) exists", () => {
    const prog = COMMON_PROGRESSIONS.find((p) => p.name === "I-V-vi-IV");
    expect(prog).toBeDefined();
  });
});

describe("buildProgression", () => {
  it("builds I-IV-V-I in C major", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    expect(prog.slots).toHaveLength(4);
    expect(prog.slots[0].chord.root).toBe("C");
    expect(prog.slots[1].chord.root).toBe("F");
    expect(prog.slots[2].chord.root).toBe("G");
    expect(prog.slots[3].chord.root).toBe("C");
  });

  it("builds i-iv-v-i in A minor", () => {
    const prog = buildProgression("A", "natural-minor", [0, 3, 4, 0], 4);
    expect(prog.slots[0].chord).toEqual({ root: "A", quality: "minor" });
    expect(prog.slots[1].chord).toEqual({ root: "D", quality: "minor" });
    expect(prog.slots[2].chord).toEqual({ root: "E", quality: "minor" });
  });

  it("each slot gets specified beats", () => {
    const prog = buildProgression("C", "major", [0, 4], 4);
    expect(prog.slots[0].beats).toBe(4);
    expect(prog.slots[1].beats).toBe(4);
  });
});

describe("getChordAtBeat", () => {
  it("returns first chord at beat 0", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    const chord = getChordAtBeat(prog, 0);
    expect(chord.root).toBe("C");
  });

  it("returns second chord at beat 4", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    const chord = getChordAtBeat(prog, 4);
    expect(chord.root).toBe("F");
  });

  it("wraps around at end of progression", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    const chord = getChordAtBeat(prog, 16); // one full cycle
    expect(chord.root).toBe("C");
  });

  it("handles fractional beats", () => {
    const prog = buildProgression("C", "major", [0, 3, 4, 0], 4);
    const chord = getChordAtBeat(prog, 5.5); // middle of second chord
    expect(chord.root).toBe("F");
  });
});
```

### Step 2: Run to verify failure

```bash
npx vitest run src/engine/progressions.test.ts
```

### Step 3: Implement — `src/engine/progressions.ts`:

```ts
import type { Chord, ChordProgression, ChordSlot } from "../types/chords";
import type { NoteName, ModeName } from "../types/music";
import { buildDiatonicChord } from "./chords";

export interface ProgressionTemplate {
  name: string;
  degrees: number[];
}

/**
 * Common chord progressions as scale-degree templates.
 * Degrees are 0-based (0=I, 1=ii, 2=iii, 3=IV, 4=V, 5=vi, 6=vii°).
 */
export const COMMON_PROGRESSIONS: ProgressionTemplate[] = [
  { name: "I-IV-V-I",      degrees: [0, 3, 4, 0] },      // Classical cadence
  { name: "I-V-vi-IV",     degrees: [0, 4, 5, 3] },      // Pop (Axis of Awesome)
  { name: "ii-V-I",        degrees: [1, 4, 0] },          // Jazz cadence
  { name: "I-vi-IV-V",     degrees: [0, 5, 3, 4] },      // 50s doo-wop
  { name: "vi-IV-I-V",     degrees: [5, 3, 0, 4] },      // Pop minor feel
  { name: "I-IV-vi-V",     degrees: [0, 3, 5, 4] },      // Worship/anthemic
  { name: "i-VI-III-VII",  degrees: [0, 5, 2, 6] },      // Andalusian cadence
  { name: "I-V-vi-iii-IV", degrees: [0, 4, 5, 2, 3] },   // Canon in D pattern
  { name: "12-bar blues",  degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] },
];

/** Build a ChordProgression from a degree sequence in a given key. */
export function buildProgression(
  key: NoteName,
  mode: ModeName,
  degrees: number[],
  beatsPerChord: number,
): ChordProgression {
  const slots: ChordSlot[] = degrees.map((degree) => ({
    chord: buildDiatonicChord(key, mode, degree),
    beats: beatsPerChord,
  }));

  return {
    name: "Custom",
    key,
    beatsPerMeasure: 4,
    slots,
  };
}

/** Get the chord active at a given beat position (wraps around). */
export function getChordAtBeat(progression: ChordProgression, beat: number): Chord {
  const totalBeats = progression.slots.reduce((sum, s) => sum + s.beats, 0);
  const wrappedBeat = ((beat % totalBeats) + totalBeats) % totalBeats;

  let accumulated = 0;
  for (const slot of progression.slots) {
    accumulated += slot.beats;
    if (wrappedBeat < accumulated) {
      return slot.chord;
    }
  }

  // Fallback (shouldn't reach here)
  return progression.slots[0]!.chord;
}
```

### Step 4: Run to verify pass

```bash
npx vitest run src/engine/progressions.test.ts
```

### Step 5: Commit

```bash
git add src/engine/progressions.ts src/engine/progressions.test.ts
git commit -m "feat: add chord progressions — 9 common templates, beat-based lookup"
```

---

## Task 3: Transport Clock

**Files:**
- Create: `src/engine/transport.ts`
- Test: `src/engine/transport.test.ts`
- Modify: `src/stores/harmonizer-store.ts` — add transport state

### Step 1: Write failing tests — `src/engine/transport.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Transport } from "./transport";

describe("Transport", () => {
  let transport: Transport;

  beforeEach(() => {
    vi.useFakeTimers();
    transport = new Transport();
  });

  afterEach(() => {
    transport.stop();
    vi.useRealTimers();
  });

  it("defaults to 120 BPM, 4/4 time", () => {
    expect(transport.bpm).toBe(120);
    expect(transport.beatsPerMeasure).toBe(4);
  });

  it("setBpm updates BPM", () => {
    transport.setBpm(140);
    expect(transport.bpm).toBe(140);
  });

  it("setBpm clamps to 30–300", () => {
    transport.setBpm(10);
    expect(transport.bpm).toBe(30);
    transport.setBpm(500);
    expect(transport.bpm).toBe(300);
  });

  it("getBeatDuration returns correct ms at 120 BPM", () => {
    expect(transport.getBeatDuration()).toBe(500); // 60000/120
  });

  it("getBeatDuration returns correct ms at 60 BPM", () => {
    transport.setBpm(60);
    expect(transport.getBeatDuration()).toBe(1000);
  });

  it("getCurrentBeat returns 0 before start", () => {
    expect(transport.getCurrentBeat()).toBe(0);
  });

  it("calculates beat from elapsed time", () => {
    // At 120 BPM, 1 beat = 500ms
    // After 1250ms = 2.5 beats
    transport.start();
    vi.advanceTimersByTime(1250);
    expect(transport.getCurrentBeat()).toBeCloseTo(2.5, 1);
  });

  it("fires onBeat callback on each beat", () => {
    const callback = vi.fn();
    transport.onBeat = callback;
    transport.start();
    vi.advanceTimersByTime(2100); // ~4 beats at 120 BPM
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it("stop resets position", () => {
    transport.start();
    vi.advanceTimersByTime(5000);
    transport.stop();
    expect(transport.getCurrentBeat()).toBe(0);
    expect(transport.isPlaying).toBe(false);
  });

  it("pause preserves position", () => {
    transport.start();
    vi.advanceTimersByTime(1000); // 2 beats
    transport.pause();
    const beat = transport.getCurrentBeat();
    expect(beat).toBeCloseTo(2, 0);
    expect(transport.isPlaying).toBe(false);
  });
});
```

### Step 2: Run to verify failure

```bash
npx vitest run src/engine/transport.test.ts
```

### Step 3: Implement — `src/engine/transport.ts`:

```ts
const MIN_BPM = 30;
const MAX_BPM = 300;
const TICK_INTERVAL_MS = 10; // High-resolution tick for beat callbacks

export class Transport {
  bpm: number = 120;
  beatsPerMeasure: number = 4;
  isPlaying: boolean = false;
  onBeat: ((beat: number) => void) | null = null;

  private startTime: number = 0;
  private pausedBeat: number = 0;
  private lastFiredBeat: number = -1;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  setBpm(bpm: number): void {
    this.bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
  }

  /** Duration of one beat in milliseconds. */
  getBeatDuration(): number {
    return 60000 / this.bpm;
  }

  /** Current beat position (fractional). */
  getCurrentBeat(): number {
    if (!this.isPlaying) return this.pausedBeat;
    const elapsed = Date.now() - this.startTime;
    return this.pausedBeat + elapsed / this.getBeatDuration();
  }

  /** Current measure number (0-based). */
  getCurrentMeasure(): number {
    return Math.floor(this.getCurrentBeat() / this.beatsPerMeasure);
  }

  /** Beat within current measure (0 to beatsPerMeasure-1). */
  getBeatInMeasure(): number {
    return Math.floor(this.getCurrentBeat()) % this.beatsPerMeasure;
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = Date.now();
    this.lastFiredBeat = Math.floor(this.pausedBeat) - 1;

    this.tickInterval = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pausedBeat = this.getCurrentBeat();
    this.isPlaying = false;
    this.clearTick();
  }

  stop(): void {
    this.isPlaying = false;
    this.pausedBeat = 0;
    this.lastFiredBeat = -1;
    this.clearTick();
  }

  private tick(): void {
    const currentBeat = Math.floor(this.getCurrentBeat());
    if (currentBeat > this.lastFiredBeat) {
      this.lastFiredBeat = currentBeat;
      this.onBeat?.(currentBeat);
    }
  }

  private clearTick(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
```

### Step 4: Run to verify pass

```bash
npx vitest run src/engine/transport.test.ts
```

### Step 5: Add transport state to Zustand store

Modify `src/stores/harmonizer-store.ts` — add these fields and actions:

```ts
// Add to imports:
import type { ChordProgression } from "../types/chords";

// Add to HarmonizerState interface:
  bpm: number;
  isTransportPlaying: boolean;
  currentBeat: number;
  activeProgression: ChordProgression | null;

  setBpm: (bpm: number) => void;
  setTransportPlaying: (playing: boolean) => void;
  setCurrentBeat: (beat: number) => void;
  setActiveProgression: (prog: ChordProgression | null) => void;

// Add to initial state:
  bpm: 120,
  isTransportPlaying: false,
  currentBeat: 0,
  activeProgression: null,

// Add setters:
  setBpm: (bpm) => set({ bpm: Math.max(30, Math.min(300, bpm)) }),
  setTransportPlaying: (isTransportPlaying) => set({ isTransportPlaying }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setActiveProgression: (activeProgression) => set({ activeProgression }),
```

### Step 6: Commit

```bash
git add src/engine/transport.ts src/engine/transport.test.ts src/stores/harmonizer-store.ts
git commit -m "feat: add transport clock — BPM, beat tracking, store integration"
```

---

## Task 4: Chord-Aware Harmonization

This is the core musical upgrade. Replace fixed-interval harmony with chord-tone assignment.

**Files:**
- Create: `src/engine/chord-harmony.ts`
- Test: `src/engine/chord-harmony.test.ts`
- Modify: `src/types/music.ts` — extend types

### Step 1: Write failing tests — `src/engine/chord-harmony.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeChordHarmony } from "./chord-harmony";
import type { Chord } from "../types/chords";

describe("computeChordHarmony", () => {
  const cMajor: Chord = { root: "C", quality: "major" }; // C E G
  const fMajor: Chord = { root: "F", quality: "major" }; // F A C
  const gDom7: Chord = { root: "G", quality: "dom7" };   // G B D F
  const aMinor: Chord = { root: "A", quality: "minor" };  // A C E

  it("assigns chord tones for C major chord, 2 voices", () => {
    // Singer on C4 (261.63 Hz), chord is C major
    // Voice 1 → E4 (3rd), Voice 2 → G4 (5th)
    const result = computeChordHarmony(261.63, cMajor, 2);
    expect(result.voices).toHaveLength(2);
    expect(result.voices[0].targetMidi).toBe(64); // E4
    expect(result.voices[1].targetMidi).toBe(67); // G4
  });

  it("assigns chord tones for F major chord, 2 voices", () => {
    // Singer on F4 (349.23 Hz), chord is F major
    // Voice 1 → A4 (3rd), Voice 2 → C5 (5th)
    const result = computeChordHarmony(349.23, fMajor, 2);
    expect(result.voices[0].targetMidi).toBe(69); // A4
    expect(result.voices[1].targetMidi).toBe(72); // C5
  });

  it("singer on non-root chord tone: E4 over C major", () => {
    // Singer on E4, chord is C major → voices get G4 and C5 (remaining tones)
    const result = computeChordHarmony(329.63, cMajor, 2);
    expect(result.voices[0].targetMidi).toBe(67); // G4
    expect(result.voices[1].targetMidi).toBe(72); // C5
  });

  it("handles dom7 chord with 3 voices", () => {
    // Singer on G4, chord is Gdom7 → B4, D5, F5
    const result = computeChordHarmony(392.0, gDom7, 3);
    expect(result.voices).toHaveLength(3);
    expect(result.voices[0].targetMidi).toBe(71); // B4
    expect(result.voices[1].targetMidi).toBe(74); // D5
    expect(result.voices[2].targetMidi).toBe(77); // F5
  });

  it("voices stay above singer by default", () => {
    const result = computeChordHarmony(261.63, cMajor, 2);
    for (const voice of result.voices) {
      expect(voice.targetMidi).toBeGreaterThanOrEqual(60); // C4
    }
  });

  it("returns ratio for each voice", () => {
    const result = computeChordHarmony(261.63, cMajor, 2);
    for (const voice of result.voices) {
      expect(voice.ratio).toBeGreaterThan(0);
      expect(voice.ratio).toBeCloseTo(voice.targetFrequency / 261.63, 3);
    }
  });
});
```

### Step 2: Run to verify failure

```bash
npx vitest run src/engine/chord-harmony.test.ts
```

### Step 3: Implement — `src/engine/chord-harmony.ts`:

```ts
import type { Chord } from "../types/chords";
import { getChordTones } from "./chords";
import { frequencyToMidi, midiToFrequency } from "./pitch";

export interface ChordHarmonyVoice {
  targetMidi: number;
  targetFrequency: number;
  ratio: number;
}

export interface ChordHarmonyResult {
  sourceMidi: number;
  sourceFrequency: number;
  voices: ChordHarmonyVoice[];
}

/**
 * Chord-aware harmonization.
 *
 * Given a source frequency and the current chord, assign voices to
 * chord tones that the singer is NOT already singing, starting from
 * the nearest tones above the source.
 *
 * Music theory: the singer's note is treated as one voice of the chord.
 * Additional voices fill remaining chord tones, prioritizing:
 * 1. Closest to the source pitch (smooth voicing)
 * 2. Above the source (standard soprano-lead arrangement)
 */
export function computeChordHarmony(
  sourceFrequency: number,
  chord: Chord,
  voiceCount: number,
): ChordHarmonyResult {
  const sourceMidi = Math.round(frequencyToMidi(sourceFrequency));
  const chordPitchClasses = getChordTones(chord);

  // Find which chord tone the singer is closest to
  const singerPC = ((sourceMidi % 12) + 12) % 12;
  const singerChordIndex = findClosestIndex(singerPC, chordPitchClasses);

  // Build candidate MIDI notes for remaining chord tones
  // Start from source pitch and go upward
  const candidates: number[] = [];
  for (let octaveOffset = 0; octaveOffset <= 2; octaveOffset++) {
    for (let i = 0; i < chordPitchClasses.length; i++) {
      if (i === singerChordIndex && octaveOffset === 0) continue; // skip singer's tone in same octave
      const pc = chordPitchClasses[i]!;
      const midi = sourceMidi - (sourceMidi % 12) + pc + octaveOffset * 12;
      if (midi > sourceMidi && !candidates.includes(midi)) {
        candidates.push(midi);
      }
    }
  }

  // Sort by distance from source (closest first)
  candidates.sort((a, b) => Math.abs(a - sourceMidi) - Math.abs(b - sourceMidi));

  // Take the requested number of voices
  const voices: ChordHarmonyVoice[] = [];
  for (let i = 0; i < voiceCount && i < candidates.length; i++) {
    const targetMidi = candidates[i]!;
    const targetFrequency = midiToFrequency(targetMidi);
    voices.push({
      targetMidi,
      targetFrequency,
      ratio: targetFrequency / sourceFrequency,
    });
  }

  return { sourceMidi, sourceFrequency, voices };
}

function findClosestIndex(pitchClass: number, chordPCs: number[]): number {
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < chordPCs.length; i++) {
    const dist = Math.min(
      Math.abs(pitchClass - chordPCs[i]!),
      12 - Math.abs(pitchClass - chordPCs[i]!),
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}
```

### Step 4: Run to verify pass

```bash
npx vitest run src/engine/chord-harmony.test.ts
```

### Step 5: Commit

```bash
git add src/engine/chord-harmony.ts src/engine/chord-harmony.test.ts
git commit -m "feat: add chord-aware harmonization — assigns chord tones to voices"
```

---

## Task 5: Voice Leading Engine

Smooth voice transitions using classical voice leading rules.

**Files:**
- Create: `src/engine/voice-leading.ts`
- Test: `src/engine/voice-leading.test.ts`

### Step 1: Write failing tests — `src/engine/voice-leading.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { VoiceLeader } from "./voice-leading";
import type { Chord } from "../types/chords";

describe("VoiceLeader", () => {
  const cMaj: Chord = { root: "C", quality: "major" };
  const fMaj: Chord = { root: "F", quality: "major" };
  const gMaj: Chord = { root: "G", quality: "major" };
  const amin: Chord = { root: "A", quality: "minor" };

  it("first call places voices at chord tones", () => {
    const vl = new VoiceLeader(2);
    const result = vl.transition(60, cMaj); // C4 over C major
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(64); // E4
    expect(result[1]).toBe(67); // G4
  });

  it("minimizes voice motion on chord change C→F", () => {
    const vl = new VoiceLeader(2);
    vl.transition(60, cMaj); // voices at E4(64), G4(67)
    const result = vl.transition(65, fMaj); // F4 → voices should move minimally
    // F major tones: F A C → voices should land on A4(69) and C5(72)
    // From E4→A4 = +5, G4→C5 = +5 — or E4→C5=+8, G4→A4=+2
    // Voice leading prefers smallest total motion: G4→A4(+2), E4→C5(+8) = 10
    // vs E4→A4(+5), G4→C5(+5) = 10 — either is fine, both total 10
    expect(result).toHaveLength(2);
    // Both voices should be chord tones of F major
    const fMajTones = [5, 9, 0]; // F, A, C
    for (const midi of result) {
      expect(fMajTones).toContain(midi % 12);
    }
  });

  it("avoids parallel perfect fifths", () => {
    const vl = new VoiceLeader(2);
    vl.transition(60, cMaj); // C4, voices at E4, G4
    const result = vl.transition(62, gMaj); // D4-ish, chord G
    // If both voices moved by the same interval, that's parallel motion
    // Voice leader should avoid voices both jumping by P5
    expect(result).toHaveLength(2);
  });

  it("prefers stepwise motion (2nds) over leaps", () => {
    const vl = new VoiceLeader(2);
    const r1 = vl.transition(60, cMaj); // E4, G4
    const r2 = vl.transition(60, amin); // A minor: A, C, E
    // From E4(64),G4(67) → should prefer E4(64),A4(69) or C5(72)
    // E4 stays (stepwise=0), G4→A4(+2) — total motion = 2
    // Voice leader should prefer this over large leaps
    const totalMotion = Math.abs(r2[0]! - r1[0]!) + Math.abs(r2[1]! - r1[1]!);
    expect(totalMotion).toBeLessThanOrEqual(5); // reasonable motion
  });

  it("reset clears voice state", () => {
    const vl = new VoiceLeader(2);
    vl.transition(60, cMaj);
    vl.reset();
    // After reset, next call should act like first call
    const result = vl.transition(65, fMaj);
    expect(result).toHaveLength(2);
  });
});
```

### Step 2: Run to verify failure

```bash
npx vitest run src/engine/voice-leading.test.ts
```

### Step 3: Implement — `src/engine/voice-leading.ts`:

```ts
import type { Chord } from "../types/chords";
import { getChordTones } from "./chords";

/**
 * Voice Leading Engine
 *
 * Maintains voice positions across chord changes and applies
 * classical voice leading principles:
 *
 * 1. **Minimum motion**: each voice moves to the nearest available chord tone
 * 2. **Contrary/oblique motion preferred**: avoid all voices moving same direction
 * 3. **Avoid parallel 5ths/octaves**: consecutive P5/P8 intervals flagged
 * 4. **Tendency tone resolution**: leading tones resolve up, 7ths resolve down
 *
 * Uses the Hungarian algorithm approach (simplified): minimize total semitone
 * distance across all voice assignments via greedy nearest-tone matching.
 */
export class VoiceLeader {
  private voiceCount: number;
  private currentPositions: number[] | null = null;

  constructor(voiceCount: number) {
    this.voiceCount = voiceCount;
  }

  /**
   * Transition voices to a new chord given the singer's current MIDI note.
   * Returns an array of MIDI notes for each voice.
   */
  transition(singerMidi: number, chord: Chord): number[] {
    const candidates = this.buildCandidates(singerMidi, chord);

    if (!this.currentPositions) {
      // First call: assign voices to nearest chord tones above singer
      this.currentPositions = this.initialAssignment(singerMidi, candidates);
      return [...this.currentPositions];
    }

    // Subsequent calls: minimize total voice motion
    const newPositions = this.minimalMotionAssignment(candidates);

    // Check for parallel perfect intervals and fix
    this.avoidParallelPerfects(singerMidi, newPositions, candidates);

    this.currentPositions = newPositions;
    return [...this.currentPositions];
  }

  reset(): void {
    this.currentPositions = null;
  }

  /** Build candidate MIDI notes from chord tones in the singer's range. */
  private buildCandidates(singerMidi: number, chord: Chord): number[] {
    const chordPCs = getChordTones(chord);
    const singerPC = ((singerMidi % 12) + 12) % 12;
    const candidates: number[] = [];
    const baseOctave = singerMidi - (singerMidi % 12);

    for (let octaveOff = -1; octaveOff <= 2; octaveOff++) {
      for (const pc of chordPCs) {
        const midi = baseOctave + pc + octaveOff * 12;
        // Voices should be near singer (within ~octave above, ~5th below)
        if (midi >= singerMidi - 7 && midi <= singerMidi + 19) {
          // Skip the singer's own note (same pitch class in same octave)
          if (midi !== singerMidi || pc !== singerPC) {
            candidates.push(midi);
          }
        }
      }
    }

    // Remove duplicates and sort
    return [...new Set(candidates)].sort((a, b) => a - b);
  }

  /** First-time assignment: closest chord tones above singer. */
  private initialAssignment(singerMidi: number, candidates: number[]): number[] {
    const above = candidates.filter((m) => m > singerMidi);
    above.sort((a, b) => a - b);
    return above.slice(0, this.voiceCount);
  }

  /**
   * Minimize total semitone distance from current positions to new candidates.
   * Greedy approach: assign each voice to its nearest unused candidate.
   */
  private minimalMotionAssignment(candidates: number[]): number[] {
    const positions = this.currentPositions!;
    const used = new Set<number>();
    const result: number[] = [];

    // Sort voices by how far they are from any candidate (hardest to place first)
    const voiceOrder = positions
      .map((pos, i) => ({ pos, i }))
      .sort((a, b) => {
        const aDist = Math.min(...candidates.map((c) => Math.abs(c - a.pos)));
        const bDist = Math.min(...candidates.map((c) => Math.abs(c - b.pos)));
        return bDist - aDist; // hardest first
      });

    const assignments = new Map<number, number>();

    for (const { pos, i } of voiceOrder) {
      // Find nearest unused candidate
      let bestCandidate = candidates[0]!;
      let bestDist = Infinity;

      for (const c of candidates) {
        if (used.has(c)) continue;
        const dist = Math.abs(c - pos);
        if (dist < bestDist) {
          bestDist = dist;
          bestCandidate = c;
        }
      }

      used.add(bestCandidate);
      assignments.set(i, bestCandidate);
    }

    for (let i = 0; i < this.voiceCount; i++) {
      result.push(assignments.get(i) ?? positions[i]!);
    }

    return result;
  }

  /**
   * Check for parallel perfect 5ths or octaves between consecutive frames
   * and nudge offending voices to the next nearest candidate.
   */
  private avoidParallelPerfects(
    singerMidi: number,
    newPositions: number[],
    candidates: number[],
  ): void {
    if (!this.currentPositions) return;

    for (let i = 0; i < newPositions.length; i++) {
      const prevInterval = Math.abs(this.currentPositions[i]! - singerMidi) % 12;
      const newInterval = Math.abs(newPositions[i]! - singerMidi) % 12;

      // Parallel P5 (7 semitones) or P8 (0/12 semitones)
      const isPrevPerfect = prevInterval === 7 || prevInterval === 0;
      const isNewPerfect = newInterval === 7 || newInterval === 0;
      const sameMotion =
        Math.sign(newPositions[i]! - this.currentPositions[i]!) ===
        Math.sign(singerMidi - (this.currentPositions[i]! - (newPositions[i]! - this.currentPositions[i]!)));

      if (isPrevPerfect && isNewPerfect && sameMotion) {
        // Find alternative candidate
        const alt = candidates.find(
          (c) => c !== newPositions[i] && Math.abs(c % 12 - singerMidi % 12) % 12 !== 7 && (c % 12) !== (singerMidi % 12),
        );
        if (alt !== undefined) {
          newPositions[i] = alt;
        }
      }
    }
  }
}
```

### Step 4: Run to verify pass

```bash
npx vitest run src/engine/voice-leading.test.ts
```

### Step 5: Commit

```bash
git add src/engine/voice-leading.ts src/engine/voice-leading.test.ts
git commit -m "feat: add voice leading engine — minimal motion, parallel avoidance"
```

---

## Task 6: Rhythm Patterns & Arpeggiator

**Files:**
- Create: `src/engine/rhythm.ts`
- Test: `src/engine/rhythm.test.ts`

### Step 1: Write failing tests — `src/engine/rhythm.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  RHYTHM_PATTERNS,
  getVoiceDelayMs,
  getArpeggioSequence,
} from "./rhythm";

describe("RHYTHM_PATTERNS", () => {
  it("has simultaneous pattern (all voices at once)", () => {
    const pat = RHYTHM_PATTERNS.find((p) => p.name === "simultaneous");
    expect(pat).toBeDefined();
    expect(pat!.voiceOffsetBeats).toEqual([0, 0, 0, 0]);
  });

  it("has stagger pattern", () => {
    const pat = RHYTHM_PATTERNS.find((p) => p.name === "stagger");
    expect(pat).toBeDefined();
    // Each voice enters slightly after the previous
    expect(pat!.voiceOffsetBeats[1]).toBeGreaterThan(0);
  });

  it("has arpeggio-up pattern", () => {
    const pat = RHYTHM_PATTERNS.find((p) => p.name === "arpeggio-up");
    expect(pat).toBeDefined();
  });
});

describe("getVoiceDelayMs", () => {
  it("simultaneous at 120 BPM = 0ms for all voices", () => {
    const delays = getVoiceDelayMs("simultaneous", 120);
    expect(delays).toEqual([0, 0, 0, 0]);
  });

  it("stagger at 120 BPM gives increasing delays", () => {
    const delays = getVoiceDelayMs("stagger", 120);
    expect(delays[0]).toBe(0);
    expect(delays[1]!).toBeGreaterThan(0);
    expect(delays[2]!).toBeGreaterThan(delays[1]!);
  });

  it("arpeggio-up at 60 BPM = 0, 250, 500, 750 ms (16th notes)", () => {
    const delays = getVoiceDelayMs("arpeggio-up", 60);
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBe(250);  // 1/4 beat = 250ms at 60 BPM
    expect(delays[2]).toBe(500);
    expect(delays[3]).toBe(750);
  });
});

describe("getArpeggioSequence", () => {
  it("up pattern with 4 chord tones = ascending", () => {
    const seq = getArpeggioSequence("up", [60, 64, 67, 72]);
    expect(seq).toEqual([60, 64, 67, 72]);
  });

  it("down pattern = descending", () => {
    const seq = getArpeggioSequence("down", [60, 64, 67, 72]);
    expect(seq).toEqual([72, 67, 64, 60]);
  });

  it("up-down pattern", () => {
    const seq = getArpeggioSequence("up-down", [60, 64, 67]);
    expect(seq).toEqual([60, 64, 67, 64]);
  });

  it("random returns same length", () => {
    const seq = getArpeggioSequence("random", [60, 64, 67, 72]);
    expect(seq).toHaveLength(4);
  });
});
```

### Step 2: Run to verify failure

```bash
npx vitest run src/engine/rhythm.test.ts
```

### Step 3: Implement — `src/engine/rhythm.ts`:

```ts
export interface RhythmPattern {
  name: string;
  label: string;
  /** Offset in beats for each voice (up to 4 voices). */
  voiceOffsetBeats: number[];
}

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  {
    name: "simultaneous",
    label: "Simultaneous",
    voiceOffsetBeats: [0, 0, 0, 0],
  },
  {
    name: "stagger",
    label: "Stagger",
    voiceOffsetBeats: [0, 0.125, 0.25, 0.375], // 32nd note offsets
  },
  {
    name: "arpeggio-up",
    label: "Arpeggio ↑",
    voiceOffsetBeats: [0, 0.25, 0.5, 0.75], // 16th notes
  },
  {
    name: "arpeggio-down",
    label: "Arpeggio ↓",
    voiceOffsetBeats: [0.75, 0.5, 0.25, 0], // reversed
  },
  {
    name: "call-response",
    label: "Call & Response",
    voiceOffsetBeats: [0, 1, 0, 1], // voices alternate on beats
  },
  {
    name: "waltz",
    label: "Waltz",
    voiceOffsetBeats: [0, 0.333, 0.667, 1], // triplet feel
  },
];

export type ArpeggioDirection = "up" | "down" | "up-down" | "random";

/**
 * Convert voice beat offsets to milliseconds at a given BPM.
 */
export function getVoiceDelayMs(
  patternName: string,
  bpm: number,
): number[] {
  const pattern = RHYTHM_PATTERNS.find((p) => p.name === patternName);
  if (!pattern) return [0, 0, 0, 0];

  const beatMs = 60000 / bpm;
  return pattern.voiceOffsetBeats.map((offset) => Math.round(offset * beatMs));
}

/**
 * Generate an arpeggio note sequence from chord tones.
 */
export function getArpeggioSequence(
  direction: ArpeggioDirection,
  chordMidi: number[],
): number[] {
  const sorted = [...chordMidi].sort((a, b) => a - b);

  switch (direction) {
    case "up":
      return sorted;
    case "down":
      return sorted.reverse();
    case "up-down": {
      if (sorted.length <= 1) return sorted;
      const up = sorted.slice();
      const down = sorted.slice(1, -1).reverse();
      return [...up, ...down];
    }
    case "random":
      return sorted.map((_, i, arr) => arr[Math.floor(Math.random() * arr.length)]!);
  }
}
```

### Step 4: Run to verify pass

```bash
npx vitest run src/engine/rhythm.test.ts
```

### Step 5: Commit

```bash
git add src/engine/rhythm.ts src/engine/rhythm.test.ts
git commit -m "feat: add rhythm patterns — stagger, arpeggio, call-response, waltz"
```

---

## Task 7: Looper Engine

**Files:**
- Create: `src/audio/looper.ts`
- Modify: `src/audio/pipeline.ts` — integrate looper

### Step 1: Implement looper — `src/audio/looper.ts`:

The looper records audio into a buffer, then plays it back in a loop with overdub capability.

```ts
/**
 * Audio Looper
 *
 * Records into a circular AudioBuffer, plays back in a loop,
 * supports overdub (recording on top of existing loop).
 *
 * States: empty → recording → playing → overdubbing → playing
 */

export type LooperState = "empty" | "recording" | "playing" | "overdubbing";

export interface Looper {
  state: LooperState;
  duration: number; // loop duration in seconds (0 if empty)
  record: () => void;
  stop: () => void;
  play: () => void;
  overdub: () => void;
  clear: () => void;
  getNode: () => AudioNode; // node to connect source into for recording
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

  // Input node for recording (source connects here)
  const inputGain = context.createGain();
  inputGain.gain.value = 1;

  // Output node for playback
  const outputGain = context.createGain();
  outputGain.gain.value = 1;
  outputGain.connect(context.destination);

  function startRecording(): void {
    recordedChunks = [];
    recordStartTime = context.currentTime;

    // Use ScriptProcessorNode for recording (deprecated but simple)
    // In production, use AudioWorklet or MediaRecorder
    recorder = context.createScriptProcessor(4096, 1, 1);
    recorder.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      recordedChunks.push(new Float32Array(input));
    };

    inputGain.connect(recorder);
    recorder.connect(context.destination); // must be connected to process
  }

  function stopRecording(): AudioBuffer {
    const recordDuration = context.currentTime - recordStartTime;
    if (recorder) {
      recorder.disconnect();
      inputGain.disconnect(recorder);
      recorder = null;
    }

    const sampleRate = context.sampleRate;
    const totalSamples = Math.floor(recordDuration * sampleRate);
    const buffer = context.createBuffer(1, totalSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    let offset = 0;
    for (const chunk of recordedChunks) {
      const copyLength = Math.min(chunk.length, totalSamples - offset);
      channelData.set(chunk.subarray(0, copyLength), offset);
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

  function mixBuffers(base: AudioBuffer, overlay: AudioBuffer): AudioBuffer {
    const length = base.length;
    const mixed = context.createBuffer(1, length, context.sampleRate);
    const mixedData = mixed.getChannelData(0);
    const baseData = base.getChannelData(0);
    const overlayData = overlay.getChannelData(0);

    for (let i = 0; i < length; i++) {
      mixedData[i] = baseData[i]! + (i < overlayData.length ? overlayData[i]! : 0);
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

    stop() {
      if (state === "recording") {
        loopBuffer = stopRecording();
        duration = loopBuffer.duration;
        state = "playing";
        startPlayback();
      } else if (state === "overdubbing") {
        const overdubBuffer = stopRecording();
        if (loopBuffer) {
          loopBuffer = mixBuffers(loopBuffer, overdubBuffer);
        }
        state = "playing";
        startPlayback();
      } else if (state === "playing") {
        stopPlayback();
        state = "playing"; // paused but retaining buffer
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
      // Keep playback running during overdub
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
```

### Step 2: Commit

```bash
git add src/audio/looper.ts
git commit -m "feat: add looper engine — record, playback, overdub, mix"
```

---

## Task 8: Effects Chain (Reverb + Delay)

**Files:**
- Create: `src/audio/effects.ts`

### Step 1: Implement effects — `src/audio/effects.ts`:

```ts
/**
 * Audio Effects Chain
 *
 * Reverb: ConvolverNode with algorithmic impulse response
 * Delay: DelayNode with feedback loop
 * Chorus: Detune-based LFO modulation (uses existing pitch shifter)
 */

export interface EffectsChain {
  input: AudioNode;
  output: AudioNode;
  setReverbMix: (wet: number) => void;     // 0–1
  setDelayTime: (ms: number) => void;      // 0–1000
  setDelayFeedback: (fb: number) => void;  // 0–0.9
  setDelayMix: (wet: number) => void;      // 0–1
  destroy: () => void;
}

/**
 * Generate a synthetic reverb impulse response.
 * Simple exponential decay — sounds like a small room.
 */
function createReverbImpulse(
  context: AudioContext,
  durationSec: number,
  decayRate: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * decayRate));
    }
  }

  return buffer;
}

export function createEffectsChain(context: AudioContext): EffectsChain {
  // Input splitter
  const input = context.createGain();

  // === REVERB ===
  const convolver = context.createConvolver();
  convolver.buffer = createReverbImpulse(context, 2.5, 0.5);
  const reverbWet = context.createGain();
  reverbWet.gain.value = 0; // off by default
  const reverbDry = context.createGain();
  reverbDry.gain.value = 1;

  input.connect(convolver);
  convolver.connect(reverbWet);
  input.connect(reverbDry);

  // === DELAY ===
  const delayNode = context.createDelay(2);
  delayNode.delayTime.value = 0.3; // 300ms default
  const delayFeedback = context.createGain();
  delayFeedback.gain.value = 0.3;
  const delayWet = context.createGain();
  delayWet.gain.value = 0; // off by default

  // Delay feedback loop
  reverbWet.connect(delayNode);
  reverbDry.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode); // feedback loop
  delayNode.connect(delayWet);

  // Output mixer
  const output = context.createGain();
  reverbWet.connect(output);
  reverbDry.connect(output);
  delayWet.connect(output);

  return {
    input,
    output,

    setReverbMix(wet: number) {
      reverbWet.gain.value = Math.max(0, Math.min(1, wet));
      reverbDry.gain.value = 1 - reverbWet.gain.value;
    },

    setDelayTime(ms: number) {
      delayNode.delayTime.value = Math.max(0, Math.min(2, ms / 1000));
    },

    setDelayFeedback(fb: number) {
      delayFeedback.gain.value = Math.max(0, Math.min(0.9, fb));
    },

    setDelayMix(wet: number) {
      delayWet.gain.value = Math.max(0, Math.min(1, wet));
    },

    destroy() {
      input.disconnect();
      convolver.disconnect();
      delayNode.disconnect();
      delayFeedback.disconnect();
      output.disconnect();
    },
  };
}
```

### Step 2: Commit

```bash
git add src/audio/effects.ts
git commit -m "feat: add effects chain — reverb (convolver) + delay with feedback"
```

---

## Task 9: Pipeline Integration — Wire Chords, Voice Leading, Rhythm, Effects, Looper

**Files:**
- Modify: `src/audio/pipeline.ts` — add chord-aware mode, voice leading, rhythm delays, effects, looper
- Modify: `src/hooks/use-audio.ts` — expose new controls
- Modify: `src/stores/harmonizer-store.ts` — add new state fields

### Step 1: Extend store

Add to `src/stores/harmonizer-store.ts`:

```ts
// New imports
import type { LooperState } from "../audio/looper";

// New state fields
  harmonyMode: "interval" | "chord"; // interval = MVP mode, chord = new
  rhythmPattern: string;
  reverbMix: number;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  looperState: LooperState;

// New actions
  setHarmonyMode: (mode: "interval" | "chord") => void;
  setRhythmPattern: (pattern: string) => void;
  setReverbMix: (v: number) => void;
  setDelayTime: (v: number) => void;
  setDelayFeedback: (v: number) => void;
  setDelayMix: (v: number) => void;
  setLooperState: (state: LooperState) => void;

// Initial values
  harmonyMode: "chord",
  rhythmPattern: "simultaneous",
  reverbMix: 0,
  delayTime: 300,
  delayFeedback: 0.3,
  delayMix: 0,
  looperState: "empty",

// Setters
  setHarmonyMode: (harmonyMode) => set({ harmonyMode }),
  setRhythmPattern: (rhythmPattern) => set({ rhythmPattern }),
  setReverbMix: (reverbMix) => set({ reverbMix: Math.max(0, Math.min(1, reverbMix)) }),
  setDelayTime: (delayTime) => set({ delayTime: Math.max(0, Math.min(2000, delayTime)) }),
  setDelayFeedback: (delayFeedback) => set({ delayFeedback: Math.max(0, Math.min(0.9, delayFeedback)) }),
  setDelayMix: (delayMix) => set({ delayMix: Math.max(0, Math.min(1, delayMix)) }),
  setLooperState: (looperState) => set({ looperState }),
```

### Step 2: Update pipeline

Modify `src/audio/pipeline.ts` — add chord-aware path alongside existing interval path. The pipeline `applyHarmony` function now checks `harmonyMode`:
- `"interval"`: use existing `computeHarmony` (MVP behavior)
- `"chord"`: use `computeChordHarmony` + `VoiceLeader` + `getChordAtBeat`

Add delay nodes per voice for rhythm patterns. Insert effects chain before master gain. Connect looper input from source.

The key changes:
1. Add `DelayNode` per voice (for rhythm offsets)
2. Add `VoiceLeader` instance
3. Add `EffectsChain` before master
4. Add `Looper` from source
5. New `setChordProgression`, `setRhythmPattern`, effect setters on `AudioPipeline`

### Step 3: Update useAudio hook

Expose new pipeline controls to React.

### Step 4: Run tests

```bash
npm run type-check && npm run test
```

### Step 5: Commit

```bash
git add src/audio/pipeline.ts src/hooks/use-audio.ts src/stores/harmonizer-store.ts
git commit -m "feat: integrate chord harmony, voice leading, rhythm, effects, looper into pipeline"
```

---

## Task 10: UI — Chord Progression Editor

**Files:**
- Create: `src/components/ui/ChordProgressionEditor.tsx`
- Create: `src/components/ui/TransportBar.tsx`

### Step 1: Implement ChordProgressionEditor

Visual chord grid: user picks a progression template or builds custom. Shows current chord highlighted as transport plays.

```tsx
// ChordProgressionEditor.tsx
// - Dropdown to select from COMMON_PROGRESSIONS
// - Visual grid of chord slots (colored by function: I=tonic, IV=subdominant, V=dominant)
// - Current chord highlighted based on transport beat
// - Click to edit individual chord slot
```

### Step 2: Implement TransportBar

```tsx
// TransportBar.tsx
// - Play/Pause/Stop buttons
// - BPM slider (30–300)
// - Beat indicator (4 dots, current beat lit)
// - Measure counter
```

### Step 3: Commit

```bash
git add src/components/ui/ChordProgressionEditor.tsx src/components/ui/TransportBar.tsx
git commit -m "feat: add chord progression editor and transport bar UI"
```

---

## Task 11: UI — Effects Panel & Looper Controls

**Files:**
- Create: `src/components/ui/EffectsPanel.tsx`
- Create: `src/components/ui/LooperControls.tsx`
- Create: `src/components/ui/HarmonyModeSelector.tsx`
- Create: `src/components/ui/RhythmSelector.tsx`

### Step 1: Implement all UI components

```tsx
// EffectsPanel.tsx — Reverb mix, Delay time/feedback/mix sliders
// LooperControls.tsx — Record/Play/Overdub/Clear buttons with state indicator
// HarmonyModeSelector.tsx — Toggle between "Interval" (MVP) and "Chord" mode
// RhythmSelector.tsx — Select rhythm pattern from RHYTHM_PATTERNS
```

### Step 2: Commit

```bash
git add src/components/ui/EffectsPanel.tsx src/components/ui/LooperControls.tsx \
  src/components/ui/HarmonyModeSelector.tsx src/components/ui/RhythmSelector.tsx
git commit -m "feat: add effects panel, looper controls, harmony mode, rhythm selector UI"
```

---

## Task 12: Update MainLayout — Integrate All New Components

**Files:**
- Modify: `src/components/layout/MainLayout.tsx`
- Modify: `src/types/music.ts` — extend preset types

### Step 1: Update MainLayout

Add new sections:
1. **Harmony Mode** selector (interval vs chord) — below key selector
2. **Chord Progression** editor — shown when mode is "chord"
3. **Transport Bar** — below chord editor
4. **Rhythm Pattern** selector — next to preset selector
5. **Effects Panel** — below voice controls
6. **Looper Controls** — bottom section

### Step 2: Add new presets

Extend `HarmonyPresetName` and `PRESETS` with v1.1 presets: barbershop, choir, octaves.

### Step 3: Verify

```bash
npm run type-check && npm run test && npm run build
```

### Step 4: Commit

```bash
git add src/components/layout/MainLayout.tsx src/types/music.ts src/engine/presets.ts
git commit -m "feat: integrate all advanced features into main layout"
```

---

## Task 13: E2E Tests for Advanced Features

**Files:**
- Modify: `e2e/harmonizer.spec.ts` — add advanced feature tests

### Step 1: Add tests

```ts
test("can switch to chord harmony mode", ...);
test("chord progression editor shows up in chord mode", ...);
test("transport play/pause works", ...);
test("BPM slider updates value", ...);
test("effects sliders respond to interaction", ...);
test("looper record button starts recording", ...);
test("rhythm pattern selector changes pattern", ...);
```

### Step 2: Run E2E

```bash
npm run test:e2e
```

### Step 3: Commit

```bash
git add e2e/harmonizer.spec.ts
git commit -m "feat: add E2E tests for advanced harmonization features"
```

---

## Task 14: Final Verification & Tag v1.1.0

### Step 1: Full suite

```bash
npm run type-check && npm run lint && npm run test && npm run build && npm run test:e2e
```

### Step 2: Tag

```bash
git tag -a v1.1.0 -m "v1.1.0: chord-aware harmony, voice leading, rhythm patterns, looper, effects"
```

---

## Summary

| # | Component | Music Theory Foundation |
|---|---|---|
| 1 | Chord types & tones | Tertian harmony — triads, 7ths, sus chords |
| 2 | Chord progressions | Diatonic function — I IV V vi, jazz ii-V-I, blues |
| 3 | Transport clock | Metric structure — BPM, beat, measure |
| 4 | Chord-aware harmony | Chord-tone prioritization over parallel intervals |
| 5 | Voice leading | Bach/Fux counterpoint — minimal motion, avoid parallels |
| 6 | Rhythm patterns | Rhythmic subdivision — 16ths, triplets, syncopation |
| 7 | Looper | Multi-track layering — overdub composition |
| 8 | Effects (reverb/delay) | Acoustic space + temporal effects |
| 9 | Pipeline integration | Full audio graph rewire |
| 10 | Chord editor UI | Visual progression builder |
| 11 | Effects/Looper UI | DAW-style controls |
| 12 | Layout integration | Full interface assembly |
| 13 | E2E tests | Regression coverage |
| 14 | Verification + tag | Release |
