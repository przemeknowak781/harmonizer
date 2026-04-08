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

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

function Label({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-light)]">
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
    <div
      className="h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] flex flex-col"
      style={{ maxHeight: "100dvh" }}
    >
      {/* ═══ TOP BAR ═══ */}
      <header className="flex items-center gap-4 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border-light)] shrink-0">
        <h1 className="text-lg font-bold tracking-tight" style={serif}>
          Vocal Harmonizer
        </h1>

        <div className="flex-1" />

        {/* Master Volume — inline in header */}
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-light)]">Master</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={masterVolume}
          onChange={(e) => { const v = Number(e.target.value); setMasterVolume(v); pipeline.current?.setMasterVolume(v); }}
          className="w-28"
        />
        <span className="text-[10px] text-[var(--text-muted)] w-8" style={mono}>
          {Math.round(masterVolume * 100)}
        </span>

        {/* Start/Stop */}
        {!isListening ? (
          <button onClick={start} className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-bold transition-colors">
            Start
          </button>
        ) : (
          <button onClick={stop} className="px-4 py-1.5 bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white rounded-lg text-xs font-bold transition-colors">
            Stop
          </button>
        )}
      </header>

      {error && <p className="text-[var(--danger)] text-center text-xs py-1 shrink-0">{error}</p>}

      {/* ═══ MAIN GRID ═══ */}
      <div className="flex-1 grid grid-cols-[1fr_1fr] grid-rows-[auto_1fr] gap-2 p-2 min-h-0">

        {/* ─── TOP LEFT: Pitch + Waveform ─── */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] p-3 flex flex-col gap-2 overflow-hidden"
          style={{ boxShadow: "0 1px 4px rgba(44,36,22,0.06)" }}>
          <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
          <Waveform analyser={analyser} />
        </div>

        {/* ─── TOP RIGHT: Mode + Config ─── */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] p-3 flex flex-col gap-2 overflow-y-auto min-h-0"
          style={{ boxShadow: "0 1px 4px rgba(44,36,22,0.06)" }}>
          <Label>Mode</Label>
          <HarmonyModeSelector />

          {/* Mode-specific config */}
          {harmonyMode === "fifths" ? (
            <>
              <Label>Circle of Fifths</Label>
              <CofPresetSelector />
            </>
          ) : harmonyMode === "geometric" ? null : (
            <>
              <Label>Key &amp; Preset</Label>
              <KeySelector
                root={key.root} mode={key.mode}
                onRootChange={(root) => setKey({ ...key, root })}
                onModeChange={(mode) => setKey({ ...key, mode })}
              />
              <PresetSelector value={presetName} onChange={setPreset} />
              <RhythmSelector />
            </>
          )}

          {(harmonyMode === "chord" || harmonyMode === "geometric") && (
            <>
              <Label>Progression</Label>
              <ChordProgressionEditor />
              <TransportBar pipeline={pipeline} />
            </>
          )}
        </div>

        {/* ─── BOTTOM LEFT: Voices + Looper ─── */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] p-3 flex flex-col gap-2 overflow-y-auto min-h-0"
          style={{ boxShadow: "0 1px 4px rgba(44,36,22,0.06)" }}>
          <Label>Voices</Label>
          <VoiceEditor pipeline={pipeline} />

          <Label>Looper</Label>
          <LooperControls pipeline={pipeline} />
        </div>

        {/* ─── BOTTOM RIGHT: Effects + Smoothing + Range ─── */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border-light)] p-3 flex flex-col gap-2 overflow-y-auto min-h-0"
          style={{ boxShadow: "0 1px 4px rgba(44,36,22,0.06)" }}>
          <Label>Effects</Label>
          <EffectsPanel pipeline={pipeline} />

          <Label>Smoothing</Label>
          <SmoothingPanel pipeline={pipeline} />

          <Label>Transpose Range</Label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-light)] w-6">Low</span>
            <input type="range" min={0.125} max={1} step={0.125}
              value={minTransposeRatio}
              onChange={(e) => { const v = Number(e.target.value); setMinTransposeRatio(v); pipeline.current?.setMinTransposeRatio(v); }}
              className="flex-1" />
            <span className="text-[10px] text-[var(--text-muted)] w-10 text-right" style={mono}>
              {minTransposeRatio >= 0.5 ? "-1" : minTransposeRatio >= 0.25 ? "-2" : "-3"} oct
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-light)] w-6">High</span>
            <input type="range" min={1} max={8} step={0.5}
              value={maxTransposeRatio}
              onChange={(e) => { const v = Number(e.target.value); setMaxTransposeRatio(v); pipeline.current?.setMaxTransposeRatio(v); }}
              className="flex-1" />
            <span className="text-[10px] text-[var(--text-muted)] w-10 text-right" style={mono}>
              +{maxTransposeRatio <= 2 ? "1" : maxTransposeRatio <= 4 ? "2" : "3+"} oct
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
