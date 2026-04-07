# Vocal Harmonizer — Claude Code Instructions

## Project Overview

Real-time browser-based vocal harmonizer. User sings into microphone, app detects pitch and generates 1–4 harmonic voices. 100% client-side — zero backend, zero audio transmission.

Full specification: [Harmonizer.md](Harmonizer.md)

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + Tailwind CSS 4 |
| Build | Vite 6 |
| Audio I/O | Web Audio API (`getUserMedia`, `AudioContext`) |
| Pitch detection | AudioWorklet + YIN algorithm |
| Pitch shifting | Phase Vocoder (STFT) via AudioWorklet |
| Music theory | Custom engine (scales, intervals, chords) |
| Language | TypeScript (strict mode) |
| Testing | Vitest + Playwright |
| Linting | ESLint 9 (flat config) + Prettier |

## Architecture Rules

### Audio Pipeline (sacred — do not break)

```
Mic → getUserMedia → AudioContext → PitchDetectorWorklet → HarmonyEngine → PitchShifterWorklet[] → GainNode[] → StereoPannerNode[] → MasterGain → destination
```

- All DSP runs in `AudioWorkletProcessor` — never use deprecated `ScriptProcessorNode`
- Pitch detection: YIN algorithm, buffer 2048 samples, 50% overlap
- Pitch shifting: Phase Vocoder, FFT 4096, hop 256, Hann window
- Target latency: **< 50 ms** end-to-end

### File Structure

```
src/
├── components/          # React UI components
│   ├── ui/              # Generic UI (knobs, sliders, meters)
│   └── layout/          # Page-level layout
├── audio/               # Web Audio API wiring, context management
│   ├── worklets/        # AudioWorkletProcessor files (.ts)
│   │   ├── pitch-detector.worklet.ts
│   │   └── pitch-shifter.worklet.ts
│   └── nodes/           # Custom AudioNode wrappers
├── engine/              # Music theory engine (pure functions, no audio deps)
│   ├── scales.ts
│   ├── intervals.ts
│   ├── harmony.ts
│   └── presets.ts
├── hooks/               # React hooks (useAudio, usePitch, useHarmony)
├── stores/              # State management (Zustand)
├── types/               # Shared TypeScript types
└── utils/               # Pure utility functions
```

### Key Constraints

- **Zero backend** — everything runs client-side in the browser
- **Bundle < 500 KB** gzipped (without audio assets)
- **AudioWorklet files** must be separate entry points (Vite config)
- **Engine is pure** — `src/engine/` has zero imports from `src/audio/` or React
- **No audio leaves the device** — privacy is a core feature

## Coding Conventions

### TypeScript

- Strict mode enabled (`strict: true` in tsconfig)
- Prefer `type` over `interface` unless extending
- Use `const` assertions for music theory constants
- All audio parameters typed — no `any` for frequencies, ratios, intervals

### Audio Code

- AudioWorklet processors in dedicated `.worklet.ts` files
- Use `Float32Array` for audio buffers — never convert to regular arrays in hot paths
- Comment non-obvious DSP math with the formula/reference
- Keep worklet processors minimal — offload complex logic to message passing when possible
- Use `SharedArrayBuffer` + `Atomics` for lock-free main↔worklet communication where supported

### React

- Functional components only
- Custom hooks for all audio interaction (`useAudioContext`, `usePitchDetection`, `useHarmony`)
- Memoize expensive computations with `useMemo` — especially frequency calculations
- Use `useRef` for AudioNode references (not state — avoids re-renders)
- Zustand for global state (key, mode, preset, voice settings)

### Naming

- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Worklets: `name.worklet.ts`
- Hooks: `use-name.ts` → exports `useName`
- Constants: `SCREAMING_SNAKE_CASE`
- Music theory: use standard names (`C4`, `MIDI note number`, `cents`, `Hz`)

### Testing

- Unit tests for engine (`src/engine/`) — pure functions, easy to test
- Use Vitest for unit/integration tests
- Playwright for E2E (microphone mocking via `getUserMedia` override)
- Snapshot tests for harmony presets (given input pitch + key → expected output frequencies)

## Performance Guidelines

- Never allocate in the audio thread (`process()` method) — pre-allocate buffers
- Avoid `console.log` in worklet processors (causes GC pauses)
- Use `requestAnimationFrame` for visualizations — never `setInterval`
- Profile with Chrome DevTools → Performance → Web Audio tab
- Measure latency with `AudioContext.currentTime` deltas

## Git Workflow

- Branch naming: `feature/<name>`, `fix/<name>`, `refactor/<name>`
- Commit messages in English, imperative mood
- Keep audio worklet changes in separate commits from UI changes
- Tag releases: `v1.0.0`, `v1.1.0`, etc.

## Quick Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run test` — run Vitest
- `npm run test:e2e` — run Playwright
- `npm run lint` — ESLint + Prettier check
- `npm run type-check` — TypeScript compiler check (`tsc --noEmit`)
