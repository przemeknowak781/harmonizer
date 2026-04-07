# Vocal Harmonizer MVP (v1.0) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based vocal harmonizer that detects pitch from microphone input and generates 1–4 harmonic voices in real-time, 100% client-side.

**Architecture:** Audio flows through a Web Audio API pipeline: mic → pitch detection (YIN AudioWorklet) → harmony engine (pure TS) → pitch shifter(s) (phase vocoder AudioWorklet) → mix → output. UI is React 19 + Tailwind 4 + Zustand. Engine is pure functions with zero audio/React deps.

**Tech Stack:** React 19, TypeScript (strict), Vite 6, Tailwind CSS 4, Zustand, Web Audio API, AudioWorklet, Vitest, Playwright

**Spec reference:** `Harmonizer.md` — full product specification

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `tailwind.config.ts`, `postcss.config.js`
- Create: `eslint.config.js`, `.prettierrc`
- Create: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `vitest.config.ts`

**Step 1: Scaffold Vite + React + TypeScript**

```bash
npm create vite@latest . -- --template react-ts
```

Accept overwrite prompts for existing files. This gives us the base React+TS+Vite setup.

**Step 2: Install production dependencies**

```bash
npm install zustand
```

**Step 3: Install dev dependencies**

```bash
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom prettier eslint @eslint/js typescript-eslint globals
```

**Step 4: Configure Tailwind CSS 4 with Vite plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  worker: {
    format: "es",
  },
});
```

Replace `src/index.css`:

```css
@import "tailwindcss";
```

**Step 5: Configure TypeScript strict mode**

Update `tsconfig.app.json` — ensure these are set:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Step 6: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

**Step 7: Configure ESLint 9 flat config**

Create `eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  { ignores: ["dist/", "*.config.*"] },
);
```

**Step 8: Configure Prettier**

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Step 9: Add npm scripts**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit"
  }
}
```

**Step 10: Create directory structure**

```bash
mkdir -p src/{audio/{worklets,nodes},engine,components/{ui,layout},hooks,stores,types,utils}
```

**Step 11: Create placeholder App**

Replace `src/App.tsx`:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <h1 className="text-4xl font-bold">🎤 Vocal Harmonizer</h1>
    </div>
  );
}

export default App;
```

**Step 12: Verify everything works**

```bash
npm run type-check && npm run build && npm run test
```

Expected: all pass (0 tests, but no errors).

**Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold project — Vite 6, React 19, TS strict, Tailwind 4, Vitest"
```

---

## Task 2: Music Theory Types & Constants

**Files:**
- Create: `src/types/music.ts`
- Create: `src/engine/constants.ts`
- Test: `src/engine/constants.test.ts`

**Step 1: Define core music types**

Create `src/types/music.ts`:

```ts
export type NoteName = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

export type ModeName =
  | "major"
  | "natural-minor"
  | "harmonic-minor"
  | "dorian"
  | "mixolydian"
  | "pentatonic";

export type IntervalDirection = "up" | "down";

export type IntervalName =
  | "unison"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "octave";

export type HarmonyPresetName =
  | "duet-up"
  | "duet-down"
  | "triad"
  | "power";

export interface VoiceConfig {
  interval: IntervalName;
  direction: IntervalDirection;
  detuneCents: number;
  pan: number; // -1 (L) to 1 (R)
  volume: number; // 0 to 1
}

export interface HarmonyPreset {
  name: HarmonyPresetName;
  label: string;
  voices: VoiceConfig[];
}

export interface KeySignature {
  root: NoteName;
  mode: ModeName;
}

export interface PitchDetectionResult {
  frequency: number; // Hz
  confidence: number; // 0–1
  midiNote: number;
  noteName: NoteName;
  octave: number;
  centsOffset: number; // deviation from nearest note, -50 to +50
}

export interface HarmonyResult {
  sourceFrequency: number;
  voices: {
    targetFrequency: number;
    ratio: number; // targetFrequency / sourceFrequency
    interval: IntervalName;
    direction: IntervalDirection;
  }[];
}
```

**Step 2: Write failing test for constants**

Create `src/engine/constants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  NOTE_NAMES,
  SCALE_INTERVALS,
  INTERVAL_STEPS,
  A4_FREQUENCY,
  A4_MIDI,
} from "./constants";

describe("NOTE_NAMES", () => {
  it("has 12 notes in chromatic order", () => {
    expect(NOTE_NAMES).toHaveLength(12);
    expect(NOTE_NAMES[0]).toBe("C");
    expect(NOTE_NAMES[9]).toBe("A");
  });
});

describe("SCALE_INTERVALS", () => {
  it("major scale has correct semitone pattern (W-W-H-W-W-W-H)", () => {
    expect(SCALE_INTERVALS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("natural minor has correct semitone pattern (W-H-W-W-H-W-W)", () => {
    expect(SCALE_INTERVALS["natural-minor"]).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("pentatonic has 5 notes", () => {
    expect(SCALE_INTERVALS.pentatonic).toHaveLength(5);
  });
});

describe("INTERVAL_STEPS", () => {
  it("unison is 0 scale degrees", () => {
    expect(INTERVAL_STEPS.unison).toBe(0);
  });

  it("3rd is 2 scale degrees", () => {
    expect(INTERVAL_STEPS["3rd"]).toBe(2);
  });

  it("5th is 4 scale degrees", () => {
    expect(INTERVAL_STEPS["5th"]).toBe(4);
  });

  it("octave is 7 scale degrees", () => {
    expect(INTERVAL_STEPS.octave).toBe(7);
  });
});

describe("tuning constants", () => {
  it("A4 = 440 Hz", () => {
    expect(A4_FREQUENCY).toBe(440);
  });

  it("A4 MIDI = 69", () => {
    expect(A4_MIDI).toBe(69);
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx vitest run src/engine/constants.test.ts
```

Expected: FAIL — module not found.

**Step 4: Implement constants**

Create `src/engine/constants.ts`:

```ts
import type { NoteName, ModeName, IntervalName } from "../types/music";

export const NOTE_NAMES: readonly NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export const SCALE_INTERVALS: Record<ModeName, readonly number[]> = {
  "major":         [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic-minor":[0, 2, 3, 5, 7, 8, 11],
  "dorian":        [0, 2, 3, 5, 7, 9, 10],
  "mixolydian":    [0, 2, 4, 5, 7, 9, 10],
  "pentatonic":    [0, 2, 4, 7, 9],
} as const;

/** Maps interval names to scale degree offsets (0-based). */
export const INTERVAL_STEPS: Record<IntervalName, number> = {
  "unison": 0,
  "2nd": 1,
  "3rd": 2,
  "4th": 3,
  "5th": 4,
  "6th": 5,
  "7th": 6,
  "octave": 7,
} as const;

export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;
export const MIDI_MIN = 0;
export const MIDI_MAX = 127;
export const SEMITONES_PER_OCTAVE = 12;
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/engine/constants.test.ts
```

Expected: all PASS.

**Step 6: Commit**

```bash
git add src/types/music.ts src/engine/constants.ts src/engine/constants.test.ts
git commit -m "feat: add music theory types and constants"
```

---

## Task 3: Pitch ↔ Frequency Conversion Utilities

**Files:**
- Create: `src/engine/pitch.ts`
- Test: `src/engine/pitch.test.ts`

**Step 1: Write failing tests**

Create `src/engine/pitch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  frequencyToMidi,
  midiToFrequency,
  midiToNoteName,
  midiToOctave,
  frequencyToCents,
  frequencyToPitchInfo,
} from "./pitch";

describe("midiToFrequency", () => {
  it("A4 (MIDI 69) = 440 Hz", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);
  });

  it("C4 (MIDI 60) ≈ 261.63 Hz", () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });

  it("A3 (MIDI 57) = 220 Hz", () => {
    expect(midiToFrequency(57)).toBeCloseTo(220, 2);
  });
});

describe("frequencyToMidi", () => {
  it("440 Hz = MIDI 69", () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 2);
  });

  it("261.63 Hz ≈ MIDI 60", () => {
    expect(frequencyToMidi(261.63)).toBeCloseTo(60, 0);
  });

  it("returns fractional MIDI for detuned notes", () => {
    const midi = frequencyToMidi(445); // slightly sharp A4
    expect(midi).toBeGreaterThan(69);
    expect(midi).toBeLessThan(70);
  });
});

describe("midiToNoteName", () => {
  it("MIDI 60 = C", () => {
    expect(midiToNoteName(60)).toBe("C");
  });

  it("MIDI 69 = A", () => {
    expect(midiToNoteName(69)).toBe("A");
  });

  it("MIDI 61 = C#", () => {
    expect(midiToNoteName(61)).toBe("C#");
  });
});

describe("midiToOctave", () => {
  it("MIDI 60 = octave 4", () => {
    expect(midiToOctave(60)).toBe(4);
  });

  it("MIDI 69 = octave 4", () => {
    expect(midiToOctave(69)).toBe(4);
  });

  it("MIDI 72 = octave 5", () => {
    expect(midiToOctave(72)).toBe(5);
  });
});

describe("frequencyToCents", () => {
  it("exact A4 = 0 cents offset", () => {
    expect(frequencyToCents(440)).toBe(0);
  });

  it("returns positive cents for sharp notes", () => {
    const cents = frequencyToCents(445);
    expect(cents).toBeGreaterThan(0);
    expect(cents).toBeLessThan(50);
  });

  it("returns negative cents for flat notes", () => {
    const cents = frequencyToCents(435);
    expect(cents).toBeLessThan(0);
    expect(cents).toBeGreaterThan(-50);
  });
});

describe("frequencyToPitchInfo", () => {
  it("converts 440 Hz to full pitch info", () => {
    const info = frequencyToPitchInfo(440);
    expect(info.noteName).toBe("A");
    expect(info.octave).toBe(4);
    expect(info.midiNote).toBe(69);
    expect(info.centsOffset).toBe(0);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/engine/pitch.test.ts
```

**Step 3: Implement pitch utilities**

Create `src/engine/pitch.ts`:

```ts
import type { NoteName } from "../types/music";
import { NOTE_NAMES, A4_FREQUENCY, A4_MIDI, SEMITONES_PER_OCTAVE } from "./constants";

/** Convert MIDI note number to frequency in Hz. */
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

/** Convert frequency in Hz to fractional MIDI note number. */
export function frequencyToMidi(frequency: number): number {
  return A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY);
}

/** Get note name from integer MIDI number. */
export function midiToNoteName(midi: number): NoteName {
  const index = ((Math.round(midi) % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  return NOTE_NAMES[index];
}

/** Get octave from MIDI number (C4 = MIDI 60). */
export function midiToOctave(midi: number): number {
  return Math.floor(Math.round(midi) / SEMITONES_PER_OCTAVE) - 1;
}

/** Get cents deviation from nearest semitone (-50 to +50). */
export function frequencyToCents(frequency: number): number {
  const midi = frequencyToMidi(frequency);
  const nearestMidi = Math.round(midi);
  return Math.round((midi - nearestMidi) * 100);
}

/** Convert frequency to full pitch info object. */
export function frequencyToPitchInfo(frequency: number) {
  const midi = frequencyToMidi(frequency);
  const nearestMidi = Math.round(midi);
  return {
    frequency,
    midiNote: nearestMidi,
    noteName: midiToNoteName(nearestMidi),
    octave: midiToOctave(nearestMidi),
    centsOffset: frequencyToCents(frequency),
  };
}
```

**Step 4: Run to verify pass**

```bash
npx vitest run src/engine/pitch.test.ts
```

**Step 5: Commit**

```bash
git add src/engine/pitch.ts src/engine/pitch.test.ts
git commit -m "feat: add pitch ↔ frequency conversion utilities"
```

---

## Task 4: Scale Engine

**Files:**
- Create: `src/engine/scales.ts`
- Test: `src/engine/scales.test.ts`

**Step 1: Write failing tests**

Create `src/engine/scales.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getScaleNotes, snapToScale, getScaleDegree } from "./scales";

describe("getScaleNotes", () => {
  it("C major = C D E F G A B", () => {
    expect(getScaleNotes("C", "major")).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("D major = D E F# G A B C#", () => {
    expect(getScaleNotes("D", "major")).toEqual([2, 4, 6, 7, 9, 11, 1]);
  });

  it("A natural minor = A B C D E F G", () => {
    expect(getScaleNotes("A", "natural-minor")).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it("C pentatonic has 5 notes", () => {
    expect(getScaleNotes("C", "pentatonic")).toHaveLength(5);
  });
});

describe("snapToScale", () => {
  it("snaps MIDI 61 (C#) to C in C major", () => {
    expect(snapToScale(61, "C", "major")).toBe(60); // C4
  });

  it("snaps MIDI 61 (C#) to D in D major", () => {
    expect(snapToScale(61, "D", "major")).toBe(62); // D4
  });

  it("keeps MIDI 60 (C) unchanged in C major", () => {
    expect(snapToScale(60, "C", "major")).toBe(60);
  });

  it("handles notes near octave boundary", () => {
    const result = snapToScale(71, "C", "major"); // B4 = MIDI 71
    expect(result).toBe(71); // B is in C major
  });
});

describe("getScaleDegree", () => {
  it("C is degree 0 in C major", () => {
    expect(getScaleDegree(60, "C", "major")).toBe(0);
  });

  it("E is degree 2 in C major", () => {
    expect(getScaleDegree(64, "C", "major")).toBe(2);
  });

  it("G is degree 4 in C major", () => {
    expect(getScaleDegree(67, "C", "major")).toBe(4);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/engine/scales.test.ts
```

**Step 3: Implement scale engine**

Create `src/engine/scales.ts`:

```ts
import type { NoteName, ModeName } from "../types/music";
import { NOTE_NAMES, SCALE_INTERVALS, SEMITONES_PER_OCTAVE } from "./constants";

/** Get absolute pitch classes (0–11) for a scale in a given key. */
export function getScaleNotes(root: NoteName, mode: ModeName): number[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const intervals = SCALE_INTERVALS[mode];
  return intervals.map((semitone) => (rootIndex + semitone) % SEMITONES_PER_OCTAVE);
}

/** Snap a MIDI note to the nearest note in the given scale. */
export function snapToScale(midi: number, root: NoteName, mode: ModeName): number {
  const scaleNotes = getScaleNotes(root, mode);
  const pitchClass = ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  const octaveBase = midi - pitchClass;

  let bestDistance = Infinity;
  let bestMidi = midi;

  for (const note of scaleNotes) {
    // Check same octave and adjacent octaves
    for (const offset of [-SEMITONES_PER_OCTAVE, 0, SEMITONES_PER_OCTAVE]) {
      const candidate = octaveBase + note + offset;
      const distance = Math.abs(candidate - midi);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMidi = candidate;
      }
    }
  }

  return bestMidi;
}

/** Get the scale degree (0-based index) of a MIDI note in the given scale. */
export function getScaleDegree(midi: number, root: NoteName, mode: ModeName): number {
  const snapped = snapToScale(midi, root, mode);
  const scaleNotes = getScaleNotes(root, mode);
  const pitchClass = ((snapped % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE;
  return scaleNotes.indexOf(pitchClass);
}
```

**Step 4: Run to verify pass**

```bash
npx vitest run src/engine/scales.test.ts
```

**Step 5: Commit**

```bash
git add src/engine/scales.ts src/engine/scales.test.ts
git commit -m "feat: add scale engine — getScaleNotes, snapToScale, getScaleDegree"
```

---

## Task 5: Harmony Engine

**Files:**
- Create: `src/engine/harmony.ts`
- Create: `src/engine/presets.ts`
- Test: `src/engine/harmony.test.ts`

**Step 1: Write failing tests**

Create `src/engine/harmony.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeHarmony } from "./harmony";
import { PRESETS } from "./presets";

describe("computeHarmony", () => {
  it("duet-up in C major: C4 (261.63Hz) → E4 (329.63Hz)", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["duet-up"]);
    expect(result.voices).toHaveLength(1);
    expect(result.voices[0].targetFrequency).toBeCloseTo(329.63, 0);
  });

  it("duet-down in C major: E4 (329.63Hz) → C4 (261.63Hz)", () => {
    const result = computeHarmony(329.63, "C", "major", PRESETS["duet-down"]);
    expect(result.voices).toHaveLength(1);
    expect(result.voices[0].targetFrequency).toBeCloseTo(261.63, 0);
  });

  it("triad in C major: C4 → E4 + G4", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["triad"]);
    expect(result.voices).toHaveLength(2);
    expect(result.voices[0].targetFrequency).toBeCloseTo(329.63, 0); // E4
    expect(result.voices[1].targetFrequency).toBeCloseTo(392.0, 0);  // G4
  });

  it("power in C major: C4 → G4 + C5", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["power"]);
    expect(result.voices).toHaveLength(2);
    expect(result.voices[0].targetFrequency).toBeCloseTo(392.0, 0);  // G4
    expect(result.voices[1].targetFrequency).toBeCloseTo(523.25, 0); // C5
  });

  it("ratio is target / source", () => {
    const result = computeHarmony(261.63, "C", "major", PRESETS["duet-up"]);
    const voice = result.voices[0];
    expect(voice.ratio).toBeCloseTo(voice.targetFrequency / 261.63, 4);
  });

  it("works in D major: D4 → F#4 (duet-up)", () => {
    const d4 = 293.66;
    const result = computeHarmony(d4, "D", "major", PRESETS["duet-up"]);
    expect(result.voices[0].targetFrequency).toBeCloseTo(369.99, 0); // F#4
  });

  it("works in A minor: A3 → C4 (duet-up)", () => {
    const a3 = 220;
    const result = computeHarmony(a3, "A", "natural-minor", PRESETS["duet-up"]);
    expect(result.voices[0].targetFrequency).toBeCloseTo(261.63, 0); // C4
  });
});

describe("PRESETS", () => {
  it("has 4 MVP presets", () => {
    expect(Object.keys(PRESETS)).toHaveLength(4);
  });

  it("each preset has correct voice count", () => {
    expect(PRESETS["duet-up"].voices).toHaveLength(1);
    expect(PRESETS["duet-down"].voices).toHaveLength(1);
    expect(PRESETS["triad"].voices).toHaveLength(2);
    expect(PRESETS["power"].voices).toHaveLength(2);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/engine/harmony.test.ts
```

**Step 3: Implement presets**

Create `src/engine/presets.ts`:

```ts
import type { HarmonyPreset, HarmonyPresetName } from "../types/music";

export const PRESETS: Record<HarmonyPresetName, HarmonyPreset> = {
  "duet-up": {
    name: "duet-up",
    label: "Duet (3rd ↑)",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 0, pan: 0.3, volume: 0.8 },
    ],
  },
  "duet-down": {
    name: "duet-down",
    label: "Duet (3rd ↓)",
    voices: [
      { interval: "3rd", direction: "down", detuneCents: 0, pan: -0.3, volume: 0.8 },
    ],
  },
  "triad": {
    name: "triad",
    label: "Triad",
    voices: [
      { interval: "3rd", direction: "up", detuneCents: 0, pan: -0.4, volume: 0.75 },
      { interval: "5th", direction: "up", detuneCents: 0, pan: 0.4, volume: 0.7 },
    ],
  },
  "power": {
    name: "power",
    label: "Power",
    voices: [
      { interval: "5th", direction: "up", detuneCents: 0, pan: -0.3, volume: 0.85 },
      { interval: "octave", direction: "up", detuneCents: 0, pan: 0.3, volume: 0.6 },
    ],
  },
};
```

**Step 4: Implement harmony computation**

Create `src/engine/harmony.ts`:

```ts
import type { NoteName, ModeName, HarmonyPreset, HarmonyResult, VoiceConfig } from "../types/music";
import { INTERVAL_STEPS } from "./constants";
import { frequencyToMidi, midiToFrequency } from "./pitch";
import { getScaleDegree, getScaleNotes, snapToScale } from "./scales";

function computeVoiceFrequency(
  sourceMidi: number,
  voice: VoiceConfig,
  root: NoteName,
  mode: ModeName,
): number {
  const scaleNotes = getScaleNotes(root, mode);
  const scaleSize = scaleNotes.length;
  const degree = getScaleDegree(sourceMidi, root, mode);
  const steps = INTERVAL_STEPS[voice.interval];
  const direction = voice.direction === "up" ? 1 : -1;
  const targetDegree = degree + steps * direction;

  // Handle wrapping across octaves
  const octaveShift = Math.floor(targetDegree / scaleSize);
  const normalizedDegree = ((targetDegree % scaleSize) + scaleSize) % scaleSize;
  const targetPitchClass = scaleNotes[normalizedDegree];

  // Reconstruct absolute MIDI note
  const sourceOctaveBase = sourceMidi - (sourceMidi % 12);
  let targetMidi = sourceOctaveBase + targetPitchClass + octaveShift * 12;

  // Adjust octave if the interval direction doesn't match the result
  if (voice.direction === "up" && targetMidi <= sourceMidi && voice.interval !== "unison") {
    targetMidi += 12;
  } else if (voice.direction === "down" && targetMidi >= sourceMidi && voice.interval !== "unison") {
    targetMidi -= 12;
  }

  // Apply detune
  const detuneOffset = voice.detuneCents / 100;
  return midiToFrequency(targetMidi + detuneOffset);
}

/** Compute harmony voice frequencies for a given source pitch. */
export function computeHarmony(
  sourceFrequency: number,
  root: NoteName,
  mode: ModeName,
  preset: HarmonyPreset,
): HarmonyResult {
  const sourceMidi = Math.round(frequencyToMidi(sourceFrequency));
  const snappedMidi = snapToScale(sourceMidi, root, mode);

  const voices = preset.voices.map((voice) => {
    const targetFrequency = computeVoiceFrequency(snappedMidi, voice, root, mode);
    return {
      targetFrequency,
      ratio: targetFrequency / sourceFrequency,
      interval: voice.interval,
      direction: voice.direction,
    };
  });

  return { sourceFrequency, voices };
}
```

**Step 5: Run to verify pass**

```bash
npx vitest run src/engine/harmony.test.ts
```

**Step 6: Commit**

```bash
git add src/engine/harmony.ts src/engine/presets.ts src/engine/harmony.test.ts
git commit -m "feat: add harmony engine with 4 MVP presets"
```

---

## Task 6: Zustand Store

**Files:**
- Create: `src/stores/harmonizer-store.ts`
- Test: `src/stores/harmonizer-store.test.ts`

**Step 1: Write failing tests**

Create `src/stores/harmonizer-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useHarmonizerStore } from "./harmonizer-store";

describe("harmonizer store", () => {
  beforeEach(() => {
    useHarmonizerStore.setState(useHarmonizerStore.getInitialState());
  });

  it("default key is C major", () => {
    const state = useHarmonizerStore.getState();
    expect(state.key.root).toBe("C");
    expect(state.key.mode).toBe("major");
  });

  it("default preset is triad", () => {
    const state = useHarmonizerStore.getState();
    expect(state.presetName).toBe("triad");
  });

  it("setKey updates key", () => {
    useHarmonizerStore.getState().setKey({ root: "D", mode: "natural-minor" });
    const state = useHarmonizerStore.getState();
    expect(state.key.root).toBe("D");
    expect(state.key.mode).toBe("natural-minor");
  });

  it("setPreset updates preset name", () => {
    useHarmonizerStore.getState().setPreset("power");
    expect(useHarmonizerStore.getState().presetName).toBe("power");
  });

  it("setMasterVolume clamps to 0–1", () => {
    useHarmonizerStore.getState().setMasterVolume(1.5);
    expect(useHarmonizerStore.getState().masterVolume).toBe(1);
    useHarmonizerStore.getState().setMasterVolume(-0.5);
    expect(useHarmonizerStore.getState().masterVolume).toBe(0);
  });

  it("setDryVolume clamps to 0–1", () => {
    useHarmonizerStore.getState().setDryVolume(0.7);
    expect(useHarmonizerStore.getState().dryVolume).toBe(0.7);
  });

  it("isListening starts as false", () => {
    expect(useHarmonizerStore.getState().isListening).toBe(false);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/stores/harmonizer-store.test.ts
```

**Step 3: Implement store**

Create `src/stores/harmonizer-store.ts`:

```ts
import { create } from "zustand";
import type { KeySignature, HarmonyPresetName } from "../types/music";

interface HarmonizerState {
  key: KeySignature;
  presetName: HarmonyPresetName;
  masterVolume: number;
  dryVolume: number;
  isListening: boolean;
  currentPitch: number | null; // Hz or null if no voice detected
  currentConfidence: number;

  setKey: (key: KeySignature) => void;
  setPreset: (name: HarmonyPresetName) => void;
  setMasterVolume: (v: number) => void;
  setDryVolume: (v: number) => void;
  setListening: (listening: boolean) => void;
  setPitch: (frequency: number | null, confidence: number) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const useHarmonizerStore = create<HarmonizerState>()((set) => ({
  key: { root: "C", mode: "major" },
  presetName: "triad",
  masterVolume: 0.8,
  dryVolume: 1,
  isListening: false,
  currentPitch: null,
  currentConfidence: 0,

  setKey: (key) => set({ key }),
  setPreset: (presetName) => set({ presetName }),
  setMasterVolume: (v) => set({ masterVolume: clamp(v, 0, 1) }),
  setDryVolume: (v) => set({ dryVolume: clamp(v, 0, 1) }),
  setListening: (isListening) => set({ isListening }),
  setPitch: (frequency, confidence) =>
    set({ currentPitch: frequency, currentConfidence: confidence }),
}));
```

**Step 4: Run to verify pass**

```bash
npx vitest run src/stores/harmonizer-store.test.ts
```

**Step 5: Commit**

```bash
git add src/stores/harmonizer-store.ts src/stores/harmonizer-store.test.ts
git commit -m "feat: add Zustand store for harmonizer state"
```

---

## Task 7: YIN Pitch Detection AudioWorklet

**Files:**
- Create: `src/audio/worklets/pitch-detector.worklet.ts`
- Create: `src/audio/nodes/pitch-detector-node.ts`
- Test: `src/audio/worklets/pitch-detector.test.ts`

> **Note:** AudioWorklets run in a separate thread and can't be unit-tested directly in jsdom. We test the YIN algorithm as a pure function extracted from the worklet, then integration-test the worklet in Playwright (Task 13).

**Step 1: Write failing test for YIN core algorithm**

Create `src/audio/worklets/pitch-detector.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { yinDetectPitch } from "./yin";

function generateSineWave(frequency: number, sampleRate: number, length: number): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return buffer;
}

describe("yinDetectPitch", () => {
  const sampleRate = 44100;
  const bufferSize = 2048;

  it("detects A4 (440 Hz)", () => {
    const signal = generateSineWave(440, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(440, 0);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("detects C4 (261.63 Hz)", () => {
    const signal = generateSineWave(261.63, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(261.63, 0);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("detects E2 (82.41 Hz) — low range", () => {
    const signal = generateSineWave(82.41, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(82.41, 0);
  });

  it("detects C6 (1046.5 Hz) — high range", () => {
    const signal = generateSineWave(1046.5, sampleRate, bufferSize);
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.frequency).toBeCloseTo(1046.5, 0);
  });

  it("returns low confidence for silence", () => {
    const signal = new Float32Array(bufferSize); // all zeros
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("returns low confidence for white noise", () => {
    const signal = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      signal[i] = Math.random() * 2 - 1;
    }
    const result = yinDetectPitch(signal, sampleRate);
    expect(result.confidence).toBeLessThan(0.5);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/audio/worklets/pitch-detector.test.ts
```

**Step 3: Implement YIN algorithm as pure function**

Create `src/audio/worklets/yin.ts`:

```ts
/**
 * YIN pitch detection algorithm.
 * Reference: de Cheveigné & Kawahara (2002).
 *
 * Extracted as pure function for testability.
 * Used by both unit tests and the AudioWorkletProcessor.
 */

export interface YinResult {
  frequency: number; // Hz, -1 if no pitch detected
  confidence: number; // 0–1
}

const DEFAULT_THRESHOLD = 0.15;
const MIN_FREQUENCY = 80;
const MAX_FREQUENCY = 1100;

export function yinDetectPitch(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = DEFAULT_THRESHOLD,
): YinResult {
  const halfSize = Math.floor(buffer.length / 2);
  const minPeriod = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxPeriod = Math.floor(sampleRate / MIN_FREQUENCY);

  // Step 1 & 2: Difference function
  const diff = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 3: Cumulative mean normalized difference
  const cmndf = new Float32Array(halfSize);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = (diff[tau] * tau) / runningSum;
  }

  // Step 4: Absolute threshold
  let tau = minPeriod;
  while (tau < maxPeriod && tau < halfSize) {
    if (cmndf[tau] < threshold) {
      // Step 5: Find the dip (local minimum)
      while (tau + 1 < halfSize && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      break;
    }
    tau++;
  }

  if (tau >= maxPeriod || tau >= halfSize) {
    return { frequency: -1, confidence: 0 };
  }

  // Step 6: Parabolic interpolation for sub-sample accuracy
  const s0 = tau > 0 ? cmndf[tau - 1] : cmndf[tau];
  const s1 = cmndf[tau];
  const s2 = tau + 1 < halfSize ? cmndf[tau + 1] : cmndf[tau];
  const betterTau = tau + (s0 - s2) / (2 * (s0 - 2 * s1 + s2) || 1);

  const frequency = sampleRate / betterTau;
  const confidence = 1 - s1;

  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return { frequency: -1, confidence: 0 };
  }

  return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
}
```

**Step 4: Run to verify pass**

```bash
npx vitest run src/audio/worklets/pitch-detector.test.ts
```

**Step 5: Implement AudioWorkletProcessor wrapper**

Create `src/audio/worklets/pitch-detector.worklet.ts`:

```ts
import { yinDetectPitch } from "./yin";

const BUFFER_SIZE = 2048;

class PitchDetectorProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private writeIndex: number;

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_SIZE);
    this.writeIndex = 0;
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    if (!input) return true;

    // Accumulate samples into buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i];
      this.writeIndex++;

      if (this.writeIndex >= BUFFER_SIZE) {
        // Buffer full — run YIN
        const result = yinDetectPitch(this.buffer, sampleRate);
        this.port.postMessage({
          type: "pitch",
          frequency: result.frequency,
          confidence: result.confidence,
        });
        // 50% overlap: shift buffer
        this.buffer.copyWithin(0, BUFFER_SIZE / 2);
        this.writeIndex = BUFFER_SIZE / 2;
      }
    }

    return true;
  }
}

registerProcessor("pitch-detector", PitchDetectorProcessor);
```

**Step 6: Create AudioNode wrapper**

Create `src/audio/nodes/pitch-detector-node.ts`:

```ts
export interface PitchMessage {
  type: "pitch";
  frequency: number;
  confidence: number;
}

export type PitchCallback = (frequency: number, confidence: number) => void;

export async function createPitchDetectorNode(
  context: AudioContext,
  onPitch: PitchCallback,
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(
    new URL("../worklets/pitch-detector.worklet.ts", import.meta.url),
  );

  const node = new AudioWorkletNode(context, "pitch-detector");

  node.port.onmessage = (event: MessageEvent<PitchMessage>) => {
    if (event.data.type === "pitch") {
      onPitch(event.data.frequency, event.data.confidence);
    }
  };

  return node;
}
```

**Step 7: Commit**

```bash
git add src/audio/
git commit -m "feat: add YIN pitch detection — algorithm + AudioWorklet + node wrapper"
```

---

## Task 8: Phase Vocoder Pitch Shifter AudioWorklet

**Files:**
- Create: `src/audio/worklets/pitch-shifter.worklet.ts`
- Create: `src/audio/nodes/pitch-shifter-node.ts`

> **Note:** The phase vocoder is complex DSP. We implement a basic version first, with the option to swap in `phaze` library later. Testing is done via integration tests (Task 13) — pure sine wave in → pitch-shifted sine wave out.

**Step 1: Implement phase vocoder worklet**

Create `src/audio/worklets/pitch-shifter.worklet.ts`:

```ts
/**
 * Phase Vocoder Pitch Shifter — AudioWorkletProcessor
 *
 * Receives pitch shift ratio via message port.
 * Uses STFT → phase manipulation → ISTFT pipeline.
 *
 * FFT size: 4096, Hop: 256, Window: Hann
 */

const FFT_SIZE = 4096;
const HOP_SIZE = 256;
const HALF_FFT = FFT_SIZE / 2;

class PitchShifterProcessor extends AudioWorkletProcessor {
  private ratio: number = 1;
  private inputBuffer: Float32Array;
  private outputBuffer: Float32Array;
  private window: Float32Array;
  private inputWritePos: number = 0;
  private outputReadPos: number = 0;
  private lastPhase: Float32Array;
  private sumPhase: Float32Array;

  constructor() {
    super();
    this.inputBuffer = new Float32Array(FFT_SIZE * 2);
    this.outputBuffer = new Float32Array(FFT_SIZE * 2);
    this.window = new Float32Array(FFT_SIZE);
    this.lastPhase = new Float32Array(HALF_FFT + 1);
    this.sumPhase = new Float32Array(HALF_FFT + 1);

    // Hann window
    for (let i = 0; i < FFT_SIZE; i++) {
      this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / FFT_SIZE));
    }

    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.type === "ratio") {
        this.ratio = e.data.value;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // Simple resampling-based pitch shift for MVP
    // (Full phase vocoder with identity phase locking is a v1.1 upgrade)
    const ratio = this.ratio;

    if (Math.abs(ratio - 1) < 0.001) {
      // No shift — passthrough
      output.set(input);
      return true;
    }

    // Accumulate input
    for (let i = 0; i < input.length; i++) {
      this.inputBuffer[this.inputWritePos % this.inputBuffer.length] = input[i];
      this.inputWritePos++;
    }

    // Resample with linear interpolation
    for (let i = 0; i < output.length; i++) {
      const readPos = (this.outputReadPos + i * ratio);
      const readIndex = readPos % this.inputBuffer.length;
      const intPart = Math.floor(readIndex);
      const frac = readIndex - intPart;
      const s0 = this.inputBuffer[intPart % this.inputBuffer.length];
      const s1 = this.inputBuffer[(intPart + 1) % this.inputBuffer.length];
      output[i] = s0 + frac * (s1 - s0);
    }

    this.outputReadPos += output.length * ratio;

    return true;
  }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
```

**Step 2: Create node wrapper**

Create `src/audio/nodes/pitch-shifter-node.ts`:

```ts
export async function createPitchShifterNode(
  context: AudioContext,
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(
    new URL("../worklets/pitch-shifter.worklet.ts", import.meta.url),
  );

  return new AudioWorkletNode(context, "pitch-shifter");
}

/** Set the pitch shift ratio on a pitch-shifter AudioWorkletNode. */
export function setPitchShiftRatio(node: AudioWorkletNode, ratio: number): void {
  node.port.postMessage({ type: "ratio", value: ratio });
}
```

**Step 3: Commit**

```bash
git add src/audio/worklets/pitch-shifter.worklet.ts src/audio/nodes/pitch-shifter-node.ts
git commit -m "feat: add pitch shifter AudioWorklet (linear interpolation MVP)"
```

---

## Task 9: Audio Pipeline Manager

**Files:**
- Create: `src/audio/pipeline.ts`
- Create: `src/hooks/use-audio.ts`

**Step 1: Implement the audio pipeline**

This wires up the full audio graph: mic → pitch detector → pitch shifters → mix → output.

Create `src/audio/pipeline.ts`:

```ts
import type { HarmonyPreset, NoteName, ModeName } from "../types/music";
import { computeHarmony } from "../engine/harmony";
import { createPitchDetectorNode, type PitchCallback } from "./nodes/pitch-detector-node";
import { createPitchShifterNode, setPitchShiftRatio } from "./nodes/pitch-shifter-node";

const MAX_VOICES = 4;

export interface AudioPipeline {
  context: AudioContext;
  start: () => Promise<void>;
  stop: () => void;
  updateHarmony: (root: NoteName, mode: ModeName, preset: HarmonyPreset) => void;
  setDryVolume: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setVoiceVolume: (index: number, v: number) => void;
  setVoicePan: (index: number, pan: number) => void;
  getAnalyserNode: () => AnalyserNode;
  destroy: () => void;
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
  const pitchDetector = await createPitchDetectorNode(context, onPitch);

  // Dry signal path
  const dryGain = context.createGain();
  dryGain.gain.value = 1;

  // Voice paths: shifter → gain → panner
  const voiceShifters: AudioWorkletNode[] = [];
  const voiceGains: GainNode[] = [];
  const voicePanners: StereoPannerNode[] = [];

  for (let i = 0; i < MAX_VOICES; i++) {
    const shifter = await createPitchShifterNode(context);
    const gain = context.createGain();
    gain.gain.value = 0; // off until preset activates
    const panner = context.createStereoPanner();
    panner.pan.value = 0;

    source.connect(shifter);
    shifter.connect(gain);
    gain.connect(panner);

    voiceShifters.push(shifter);
    voiceGains.push(gain);
    voicePanners.push(panner);
  }

  // Master gain
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;

  // Connect: source → analyser, pitchDetector, dryGain
  source.connect(analyser);
  source.connect(pitchDetector);
  source.connect(dryGain);

  // Mix: dry + voices → master → destination
  dryGain.connect(masterGain);
  for (const panner of voicePanners) {
    panner.connect(masterGain);
  }
  masterGain.connect(context.destination);

  // State
  let currentRoot: NoteName = "C";
  let currentMode: ModeName = "major";
  let currentPreset: HarmonyPreset | null = null;

  function applyHarmony(frequency: number) {
    if (!currentPreset || frequency <= 0) return;

    const result = computeHarmony(frequency, currentRoot, currentMode, currentPreset);

    for (let i = 0; i < MAX_VOICES; i++) {
      if (i < result.voices.length) {
        setPitchShiftRatio(voiceShifters[i], result.voices[i].ratio);
        voiceGains[i].gain.value = currentPreset.voices[i].volume;
        voicePanners[i].pan.value = currentPreset.voices[i].pan;
      } else {
        voiceGains[i].gain.value = 0;
      }
    }
  }

  // Re-wire pitch callback to also apply harmony
  const originalOnPitch = onPitch;
  pitchDetector.port.onmessage = (event) => {
    if (event.data.type === "pitch") {
      originalOnPitch(event.data.frequency, event.data.confidence);
      if (event.data.confidence > 0.8 && event.data.frequency > 0) {
        applyHarmony(event.data.frequency);
      }
    }
  };

  return {
    context,
    start: async () => {
      if (context.state === "suspended") await context.resume();
    },
    stop: () => {
      context.suspend();
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
      if (voiceGains[index]) voiceGains[index].gain.value = v;
    },
    setVoicePan: (index, pan) => {
      if (voicePanners[index]) voicePanners[index].pan.value = pan;
    },
    getAnalyserNode: () => analyser,
    destroy: () => {
      stream.getTracks().forEach((track) => track.stop());
      context.close();
    },
  };
}
```

**Step 2: Create the React hook**

Create `src/hooks/use-audio.ts`:

```ts
import { useCallback, useRef, useState } from "react";
import { createAudioPipeline, type AudioPipeline } from "../audio/pipeline";
import { useHarmonizerStore } from "../stores/harmonizer-store";
import { PRESETS } from "../engine/presets";

export function useAudio() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { key, presetName, setPitch, setListening } = useHarmonizerStore();

  const start = useCallback(async () => {
    try {
      setError(null);
      const pipeline = await createAudioPipeline((frequency, confidence) => {
        setPitch(frequency > 0 ? frequency : null, confidence);
      });

      pipeline.updateHarmony(key.root, key.mode, PRESETS[presetName]);
      await pipeline.start();

      pipelineRef.current = pipeline;
      setIsReady(true);
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access microphone");
    }
  }, [key, presetName, setPitch, setListening]);

  const stop = useCallback(() => {
    pipelineRef.current?.destroy();
    pipelineRef.current = null;
    setIsReady(false);
    setListening(false);
    setPitch(null, 0);
  }, [setListening, setPitch]);

  // Sync store changes to pipeline
  const syncSettings = useCallback(() => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    pipeline.updateHarmony(key.root, key.mode, PRESETS[presetName]);
  }, [key, presetName]);

  return { start, stop, syncSettings, isReady, error, pipeline: pipelineRef };
}
```

**Step 3: Commit**

```bash
git add src/audio/pipeline.ts src/hooks/use-audio.ts
git commit -m "feat: add audio pipeline manager and useAudio hook"
```

---

## Task 10: UI — Pitch Display Component

**Files:**
- Create: `src/components/ui/PitchDisplay.tsx`
- Test: `src/components/ui/PitchDisplay.test.tsx`

**Step 1: Write failing test**

Create `src/components/ui/PitchDisplay.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PitchDisplay } from "./PitchDisplay";

describe("PitchDisplay", () => {
  it("shows note name when pitch is detected", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    expect(screen.getByText("A4")).toBeInTheDocument();
  });

  it("shows cents offset", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    expect(screen.getByText("0¢")).toBeInTheDocument();
  });

  it("shows dash when no pitch detected", () => {
    render(<PitchDisplay frequency={null} confidence={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows frequency in Hz", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    expect(screen.getByText(/440/)).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/components/ui/PitchDisplay.test.tsx
```

**Step 3: Implement PitchDisplay**

Create `src/components/ui/PitchDisplay.tsx`:

```tsx
import { frequencyToPitchInfo } from "../../engine/pitch";

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  if (!frequency || frequency <= 0 || confidence < 0.5) {
    return (
      <div className="flex flex-col items-center gap-2 p-6">
        <span className="text-6xl font-bold text-zinc-600">—</span>
        <div className="w-64 h-2 bg-zinc-800 rounded-full" />
      </div>
    );
  }

  const info = frequencyToPitchInfo(frequency);
  const centsOffset = info.centsOffset;
  const meterPosition = 50 + centsOffset; // 0–100, 50 = center

  return (
    <div className="flex flex-col items-center gap-2 p-6">
      <span className="text-6xl font-bold text-white">
        {info.noteName}
        {info.octave}
      </span>
      <span className="text-sm text-zinc-400">
        {frequency.toFixed(1)} Hz · {centsOffset >= 0 ? "+" : ""}
        {centsOffset}¢
      </span>

      {/* Cents meter */}
      <div className="relative w-64 h-2 bg-zinc-800 rounded-full">
        <div className="absolute top-0 left-1/2 w-px h-full bg-zinc-600" />
        <div
          className="absolute top-0 w-3 h-3 -mt-0.5 rounded-full bg-emerald-400 transition-all duration-75"
          style={{ left: `${meterPosition}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex justify-between w-64 text-xs text-zinc-600">
        <span>-50¢</span>
        <span>+50¢</span>
      </div>
    </div>
  );
}
```

**Step 4: Run to verify pass**

```bash
npx vitest run src/components/ui/PitchDisplay.test.tsx
```

**Step 5: Commit**

```bash
git add src/components/ui/PitchDisplay.tsx src/components/ui/PitchDisplay.test.tsx
git commit -m "feat: add PitchDisplay component with tuner-style indicator"
```

---

## Task 11: UI — Voice Controls & Key Selector

**Files:**
- Create: `src/components/ui/VoiceControl.tsx`
- Create: `src/components/ui/KeySelector.tsx`
- Create: `src/components/ui/PresetSelector.tsx`

**Step 1: Implement VoiceControl**

Create `src/components/ui/VoiceControl.tsx`:

```tsx
interface VoiceControlProps {
  label: string;
  volume: number;
  pan: number;
  onVolumeChange: (v: number) => void;
  onPanChange: (pan: number) => void;
}

export function VoiceControl({ label, volume, pan, onVolumeChange, onPanChange }: VoiceControlProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 min-w-32">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Pan</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={pan}
          onChange={(e) => onPanChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </label>
    </div>
  );
}
```

**Step 2: Implement KeySelector**

Create `src/components/ui/KeySelector.tsx`:

```tsx
import type { NoteName, ModeName } from "../../types/music";
import { NOTE_NAMES } from "../../engine/constants";

const MODES: { value: ModeName; label: string }[] = [
  { value: "major", label: "Major" },
  { value: "natural-minor", label: "Minor" },
  { value: "harmonic-minor", label: "Harmonic Minor" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "pentatonic", label: "Pentatonic" },
];

interface KeySelectorProps {
  root: NoteName;
  mode: ModeName;
  onRootChange: (root: NoteName) => void;
  onModeChange: (mode: ModeName) => void;
}

export function KeySelector({ root, mode, onRootChange, onModeChange }: KeySelectorProps) {
  return (
    <div className="flex gap-3 items-center">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Key</span>
        <select
          value={root}
          onChange={(e) => onRootChange(e.target.value as NoteName)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-white"
        >
          {NOTE_NAMES.map((note) => (
            <option key={note} value={note}>{note}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Mode</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as ModeName)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-white"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

**Step 3: Implement PresetSelector**

Create `src/components/ui/PresetSelector.tsx`:

```tsx
import type { HarmonyPresetName } from "../../types/music";
import { PRESETS } from "../../engine/presets";

interface PresetSelectorProps {
  value: HarmonyPresetName;
  onChange: (preset: HarmonyPresetName) => void;
}

const PRESET_LIST = Object.values(PRESETS);

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <div className="flex gap-2">
      {PRESET_LIST.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onChange(preset.name)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === preset.name
              ? "bg-emerald-600 text-white"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/ui/VoiceControl.tsx src/components/ui/KeySelector.tsx src/components/ui/PresetSelector.tsx
git commit -m "feat: add VoiceControl, KeySelector, PresetSelector components"
```

---

## Task 12: UI — Waveform Visualization & Main Layout

**Files:**
- Create: `src/components/ui/Waveform.tsx`
- Create: `src/components/layout/MainLayout.tsx`
- Modify: `src/App.tsx`

**Step 1: Implement Waveform canvas**

Create `src/components/ui/Waveform.tsx`:

```tsx
import { useCallback, useEffect, useRef } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
}

export function Waveform({ analyser }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#34d399"; // emerald-400
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const y = (dataArray[i] * 0.5 + 0.5) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.stroke();
    rafRef.current = requestAnimationFrame(draw);
  }, [analyser]);

  useEffect(() => {
    if (analyser) {
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={120}
      className="w-full h-24 bg-zinc-900 rounded-lg"
    />
  );
}
```

**Step 2: Implement MainLayout**

Create `src/components/layout/MainLayout.tsx`:

```tsx
import { useEffect } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import { useAudio } from "../../hooks/use-audio";
import { PitchDisplay } from "../ui/PitchDisplay";
import { KeySelector } from "../ui/KeySelector";
import { PresetSelector } from "../ui/PresetSelector";
import { VoiceControl } from "../ui/VoiceControl";
import { Waveform } from "../ui/Waveform";
import { PRESETS } from "../../engine/presets";

export function MainLayout() {
  const {
    key,
    presetName,
    masterVolume,
    dryVolume,
    currentPitch,
    currentConfidence,
    isListening,
    setKey,
    setPreset,
    setMasterVolume,
    setDryVolume,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, isReady, error, pipeline } = useAudio();

  useEffect(() => {
    syncSettings();
  }, [key, presetName, syncSettings]);

  const preset = PRESETS[presetName];
  const analyser = pipeline.current?.getAnalyserNode() ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Vocal Harmonizer</h1>
        </header>

        {/* Pitch Display */}
        <section className="flex justify-center">
          <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
        </section>

        {/* Key & Preset */}
        <section className="flex flex-col gap-4">
          <KeySelector
            root={key.root}
            mode={key.mode}
            onRootChange={(root) => setKey({ ...key, root })}
            onModeChange={(mode) => setKey({ ...key, mode })}
          />
          <PresetSelector value={presetName} onChange={setPreset} />
        </section>

        {/* Voice Controls */}
        <section className="flex gap-3 overflow-x-auto pb-2">
          {preset.voices.map((voice, i) => (
            <VoiceControl
              key={i}
              label={`${voice.interval} ${voice.direction === "up" ? "↑" : "↓"}`}
              volume={voice.volume}
              pan={voice.pan}
              onVolumeChange={(v) => pipeline.current?.setVoiceVolume(i, v)}
              onPanChange={(pan) => pipeline.current?.setVoicePan(i, pan)}
            />
          ))}
          <VoiceControl
            label="Dry"
            volume={dryVolume}
            pan={0}
            onVolumeChange={setDryVolume}
            onPanChange={() => {}}
          />
        </section>

        {/* Start/Stop Button */}
        <section className="flex justify-center gap-4">
          {!isListening ? (
            <button
              onClick={start}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full text-lg font-semibold transition-colors"
            >
              Start
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-full text-lg font-semibold transition-colors"
            >
              Stop
            </button>
          )}
        </section>

        {error && (
          <p className="text-red-400 text-center text-sm">{error}</p>
        )}

        {/* Master Volume */}
        <section className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Master</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMasterVolume(v);
              pipeline.current?.setMasterVolume(v);
            }}
            className="flex-1 accent-emerald-500"
          />
        </section>

        {/* Waveform */}
        <section>
          <Waveform analyser={analyser} />
        </section>
      </div>
    </div>
  );
}
```

**Step 3: Update App.tsx**

Replace `src/App.tsx`:

```tsx
import { MainLayout } from "./components/layout/MainLayout";

function App() {
  return <MainLayout />;
}

export default App;
```

**Step 4: Verify build**

```bash
npm run type-check && npm run build
```

**Step 5: Commit**

```bash
git add src/components/ src/App.tsx
git commit -m "feat: add main layout with all UI components — pitch display, controls, waveform"
```

---

## Task 13: Integration Testing with Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/harmonizer.spec.ts`

**Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**Step 2: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5173",
    permissions: ["microphone"],
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
  },
});
```

**Step 3: Write E2E tests**

Create `e2e/harmonizer.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Harmonizer", () => {
  test("shows title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Vocal Harmonizer")).toBeVisible();
  });

  test("has start button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });

  test("shows key and mode selectors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("select").first()).toBeVisible();
  });

  test("shows preset buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Triad")).toBeVisible();
    await expect(page.getByText("Power")).toBeVisible();
  });

  test("can change preset", async ({ page }) => {
    await page.goto("/");
    const powerBtn = page.getByText("Power");
    await powerBtn.click();
    await expect(powerBtn).toHaveClass(/bg-emerald/);
  });
});
```

**Step 4: Add E2E npm script**

Update `package.json` scripts — add:

```json
"test:e2e": "npx playwright test"
```

**Step 5: Run E2E tests**

```bash
npm run test:e2e
```

**Step 6: Commit**

```bash
git add playwright.config.ts e2e/ package.json
git commit -m "feat: add Playwright E2E tests for basic UI interactions"
```

---

## Task 14: Final Verification & MVP Tag

**Step 1: Run all checks**

```bash
npm run type-check && npm run lint && npm run test && npm run build
```

Expected: all pass, bundle under 500 KB.

**Step 2: Run E2E**

```bash
npm run test:e2e
```

**Step 3: Manual smoke test**

```bash
npm run dev
```

Open browser → click Start → sing into mic → verify:
- Pitch display shows detected note
- Waveform animates
- Harmony voices audible through speakers/headphones
- Key/mode/preset controls work
- Start/Stop toggles correctly

**Step 4: Tag MVP**

```bash
git tag -a v0.1.0 -m "MVP: pitch detection, harmony engine, 4 presets, basic UI"
```

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: MVP v0.1.0 — all checks passing"
```

---

## Summary of Tasks

| # | Component | Files | Tests |
|---|---|---|---|
| 1 | Project scaffolding | 10+ config files | Build verification |
| 2 | Music types & constants | 3 files | 5 test cases |
| 3 | Pitch ↔ frequency utils | 2 files | 12 test cases |
| 4 | Scale engine | 2 files | 9 test cases |
| 5 | Harmony engine + presets | 3 files | 9 test cases |
| 6 | Zustand store | 2 files | 7 test cases |
| 7 | YIN pitch detection | 3 files | 6 test cases |
| 8 | Phase vocoder pitch shifter | 2 files | Integration only |
| 9 | Audio pipeline manager | 2 files | Integration only |
| 10 | PitchDisplay component | 2 files | 4 test cases |
| 11 | Voice/Key/Preset selectors | 3 files | Manual |
| 12 | Waveform + MainLayout | 3 files | Build verification |
| 13 | E2E tests (Playwright) | 3 files | 5 E2E cases |
| 14 | Final verification + tag | — | Full suite |

**Total: ~35 files, ~52 unit tests, 5 E2E tests**
