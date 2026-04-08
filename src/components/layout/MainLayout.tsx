import { useEffect } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import { useAudio } from "../../hooks/use-audio";
import { PitchDisplay } from "../ui/PitchDisplay";
import { KeySelector } from "../ui/KeySelector";
import { PresetSelector } from "../ui/PresetSelector";
import { VoiceEditor } from "../ui/VoiceEditor";
import { Waveform } from "../ui/Waveform";
import { HarmonyModeSelector } from "../ui/HarmonyModeSelector";
import { RhythmSelector } from "../ui/RhythmSelector";
import { ChordProgressionEditor } from "../ui/ChordProgressionEditor";
import { TransportBar } from "../ui/TransportBar";
import { EffectsPanel } from "../ui/EffectsPanel";
import { LooperControls } from "../ui/LooperControls";
import { CofPresetSelector } from "../ui/CofPresetSelector";
import { SmoothingPanel } from "../ui/SmoothingPanel";

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-light)]">
        {children}
      </span>
      <div className="flex-1 h-px bg-[var(--border-light)]" />
    </div>
  );
}

export function MainLayout() {
  const {
    key,
    presetName,
    masterVolume,
    maxTransposeRatio,
    minTransposeRatio,
    currentPitch,
    currentConfidence,
    isListening,
    harmonyMode,
    setKey,
    setPreset,
    setMasterVolume,
    setMaxTransposeRatio,
    setMinTransposeRatio,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, isReady: _isReady, error, pipeline } = useAudio();

  useEffect(() => {
    syncSettings();
  }, [key, presetName, harmonyMode, syncSettings]);

  const analyser = pipeline.current?.getAnalyserNode() ?? null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between bg-[var(--surface)] rounded-xl px-5 py-3 border border-[var(--border-light)]" style={{ boxShadow: "var(--shadow)" }}>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Vocal Harmonizer
          </h1>
          {!isListening ? (
            <button
              onClick={start}
              className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Start
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-5 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Stop
            </button>
          )}
        </header>

        {error && (
          <p className="text-[var(--danger)] text-center text-sm">{error}</p>
        )}

        {/* Pitch Display */}
        <section className="flex justify-center bg-[var(--surface)] rounded-xl border border-[var(--border-light)]" style={{ boxShadow: "var(--shadow)" }}>
          <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
        </section>

        {/* Mode */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Mode</SectionLabel>
          <HarmonyModeSelector />
        </section>

        {/* Voices */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Voices</SectionLabel>
          <VoiceEditor pipeline={pipeline} />
        </section>

        {/* Key & Preset + Rhythm Selector */}
        {harmonyMode === "fifths" ? (
          <section className="flex flex-col gap-3">
            <SectionLabel>Circle of Fifths Preset</SectionLabel>
            <CofPresetSelector />
          </section>
        ) : harmonyMode === "geometric" ? null : (
          <section className="flex flex-col gap-4">
            <SectionLabel>Key &amp; Preset</SectionLabel>
            <KeySelector
              root={key.root}
              mode={key.mode}
              onRootChange={(root) => setKey({ ...key, root })}
              onModeChange={(mode) => setKey({ ...key, mode })}
            />
            <PresetSelector value={presetName} onChange={setPreset} />
            <RhythmSelector />
          </section>
        )}

        {/* Chord Progression Editor (chord + geometric modes) */}
        {(harmonyMode === "chord" || harmonyMode === "geometric") && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Progression</SectionLabel>
            <ChordProgressionEditor />
          </section>
        )}

        {/* Transport Bar (chord + geometric modes) */}
        {(harmonyMode === "chord" || harmonyMode === "geometric") && (
          <section className="flex flex-col gap-3">
            <SectionLabel>Transport</SectionLabel>
            <TransportBar pipeline={pipeline} />
          </section>
        )}

        {/* Effects Panel */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Effects</SectionLabel>
          <EffectsPanel pipeline={pipeline} />
        </section>

        {/* Smoothing Controls */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Smoothing</SectionLabel>
          <SmoothingPanel pipeline={pipeline} />
        </section>

        {/* Transpose Range */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Transpose Range</SectionLabel>
          <div className="flex items-center justify-end">
            <span className="text-xs text-[var(--text-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {minTransposeRatio >= 0.5 ? "-1" : minTransposeRatio >= 0.25 ? "-2" : "-3"} oct
              {" ... +"}
              {maxTransposeRatio <= 2 ? "1" : maxTransposeRatio <= 4 ? "2" : "3+"} oct
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-light)] w-8">Low</span>
            <input
              type="range"
              min={0.125}
              max={1}
              step={0.125}
              value={minTransposeRatio}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMinTransposeRatio(v);
                pipeline.current?.setMinTransposeRatio(v);
              }}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-light)] w-8">High</span>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={maxTransposeRatio}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMaxTransposeRatio(v);
                pipeline.current?.setMaxTransposeRatio(v);
              }}
              className="flex-1"
            />
          </div>
        </section>

        {/* Master Volume */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Master</SectionLabel>
          <div className="flex items-center gap-3">
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
              className="flex-1"
            />
            <span className="text-xs text-[var(--text-muted)] w-10 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {masterVolume.toFixed(2)}
            </span>
          </div>
        </section>

        {/* Waveform */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Waveform</SectionLabel>
          <Waveform analyser={analyser} />
        </section>

        {/* Looper Controls */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Looper</SectionLabel>
          <LooperControls pipeline={pipeline} />
        </section>
      </div>
    </div>
  );
}
