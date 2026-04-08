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

export function MainLayout() {
  const {
    key, presetName, masterVolume, maxTransposeRatio, minTransposeRatio,
    currentPitch, currentConfidence, isListening, harmonyMode,
    setKey, setPreset, setMasterVolume, setMaxTransposeRatio, setMinTransposeRatio,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, isReady: _isReady, error, pipeline } = useAudio();

  useEffect(() => { syncSettings(); }, [key, presetName, harmonyMode, syncSettings]);

  const analyser = pipeline.current?.getAnalyserNode() ?? null;

  return (
    <div className="h-dvh flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden">

      {/* ══════ ROW 1: TOOLBAR ══════ */}
      <header className="flex items-center gap-3 px-3 py-1.5 bg-[var(--surface)] border-b border-[var(--border-light)] shrink-0">
        <h1 className="text-sm font-bold tracking-tight text-[var(--text)]" style={serif}>Harmonizer</h1>

        <div className="h-4 w-px bg-[var(--border)]" />

        <HarmonyModeSelector />

        {harmonyMode !== "fifths" && harmonyMode !== "geometric" && (
          <>
            <div className="h-4 w-px bg-[var(--border)]" />
            <KeySelector
              root={key.root} mode={key.mode}
              onRootChange={(root) => setKey({ ...key, root })}
              onModeChange={(mode) => setKey({ ...key, mode })}
            />
          </>
        )}

        <div className="flex-1" />

        {/* Master */}
        <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">Master</span>
        <input type="range" min={0} max={1} step={0.01} value={masterVolume}
          onChange={(e) => { const v = Number(e.target.value); setMasterVolume(v); pipeline.current?.setMasterVolume(v); }}
          className="w-20" />
        <span className="text-[10px] text-[var(--text-mid)] w-6" style={mono}>{Math.round(masterVolume * 100)}</span>

        {!isListening ? (
          <button onClick={start} className="px-3 py-1 bg-[var(--green)] hover:bg-[var(--green-dim)] text-white rounded text-[11px] font-bold transition-colors">
            START
          </button>
        ) : (
          <button onClick={stop} className="px-3 py-1 bg-[var(--red)] hover:bg-[var(--red-dim)] text-white rounded text-[11px] font-bold transition-colors animate-pulse">
            STOP
          </button>
        )}
      </header>

      {error && <p className="text-[var(--red)] text-center text-[10px] py-0.5 bg-[var(--surface-sunken)] shrink-0">{error}</p>}

      {/* ══════ ROW 2: PITCH + CONFIG ══════ */}
      <div className="flex gap-px bg-[var(--border-light)] shrink-0">
        {/* Pitch + Waveform — 40% */}
        <div className="flex-[4] bg-[var(--surface)] p-3 flex flex-col items-center justify-center gap-1">
          <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
          <Waveform analyser={analyser} />
        </div>

        {/* Config — 60% */}
        <div className="flex-[6] bg-[var(--surface)] p-2 flex flex-col gap-2 overflow-y-auto">
          {harmonyMode === "fifths" ? (
            <CofPresetSelector />
          ) : harmonyMode !== "geometric" ? (
            <>
              <PresetSelector value={presetName} onChange={setPreset} />
              <RhythmSelector />
            </>
          ) : null}

          {(harmonyMode === "chord" || harmonyMode === "geometric") && (
            <>
              <ChordProgressionEditor />
              <TransportBar pipeline={pipeline} />
            </>
          )}
        </div>
      </div>

      {/* ══════ ROW 3: MIXER STRIP ══════ */}
      <div className="flex-1 flex gap-px bg-[var(--border-light)] min-h-0">
        {/* Voices + Looper — left */}
        <div className="flex-[5] bg-[var(--surface)] p-2 flex flex-col gap-2 overflow-y-auto min-h-0">
          <VoiceEditor pipeline={pipeline} />
          <div className="mt-auto pt-1 border-t border-[var(--border-light)]">
            <LooperControls pipeline={pipeline} />
          </div>
        </div>

        {/* Effects + Controls — right */}
        <div className="flex-[5] bg-[var(--surface)] p-2 flex flex-col gap-2 overflow-y-auto min-h-0">
          <EffectsPanel pipeline={pipeline} />

          <div className="border-t border-[var(--border-light)] pt-2">
            <SmoothingPanel pipeline={pipeline} />
          </div>

          <div className="border-t border-[var(--border-light)] pt-2 flex gap-3">
            <div className="flex-1 flex items-center gap-1">
              <span className="text-[9px] text-[var(--text-dim)] w-5">Lo</span>
              <input type="range" min={0.125} max={1} step={0.125}
                value={minTransposeRatio}
                onChange={(e) => { const v = Number(e.target.value); setMinTransposeRatio(v); pipeline.current?.setMinTransposeRatio(v); }}
                className="flex-1" />
              <span className="text-[9px] text-[var(--text-dim)]" style={mono}>
                {minTransposeRatio >= 0.5 ? "-1" : minTransposeRatio >= 0.25 ? "-2" : "-3"}
              </span>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <span className="text-[9px] text-[var(--text-dim)] w-5">Hi</span>
              <input type="range" min={1} max={8} step={0.5}
                value={maxTransposeRatio}
                onChange={(e) => { const v = Number(e.target.value); setMaxTransposeRatio(v); pipeline.current?.setMaxTransposeRatio(v); }}
                className="flex-1" />
              <span className="text-[9px] text-[var(--text-dim)]" style={mono}>
                +{maxTransposeRatio <= 2 ? "1" : maxTransposeRatio <= 4 ? "2" : "3+"}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
