import { useState, useEffect } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import { useAudio } from "../../hooks/use-audio";
import { PitchDisplay } from "../ui/PitchDisplay";
import { KeySelector } from "../ui/KeySelector";
import { PresetSelector } from "../ui/PresetSelector";
import { VoiceEditor } from "../ui/VoiceEditor";
import { Waveform } from "../ui/Waveform";
import { RhythmSelector } from "../ui/RhythmSelector";
import { ChordProgressionEditor } from "../ui/ChordProgressionEditor";
import { TransportBar } from "../ui/TransportBar";
import { EffectsPanel } from "../ui/EffectsPanel";
import { LooperControls } from "../ui/LooperControls";
import { CofPresetSelector } from "../ui/CofPresetSelector";
import { SmoothingPanel } from "../ui/SmoothingPanel";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

type Tab = "harmony" | "fx" | "range";

export function MainLayout() {
  const {
    key, presetName, masterVolume, maxTransposeRatio, minTransposeRatio,
    currentPitch, currentConfidence, isListening, harmonyMode,
    setKey, setPreset, setMasterVolume, setMaxTransposeRatio, setMinTransposeRatio,
    setHarmonyMode,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, isReady: _isReady, error, pipeline } = useAudio();
  const [activeTab, setActiveTab] = useState<Tab>("harmony");

  useEffect(() => { syncSettings(); }, [key, presetName, harmonyMode, syncSettings]);

  const analyser = pipeline.current?.getAnalyserNode() ?? null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">

      {/* ══════ TOOLBAR ══════ */}
      <header className="flex items-center gap-2 px-3 h-9 bg-[var(--surface)] border-b border-[var(--border-light)] shrink-0">
        <span className="text-xs font-bold tracking-tight opacity-60" style={serif}>Harmonizer</span>
        <div className="h-3 w-px bg-[var(--border)]" />

        {/* Harmony mode as dropdown */}
        <select
          value={harmonyMode}
          onChange={(e) => setHarmonyMode(e.target.value as "interval" | "chord" | "fifths" | "geometric")}
          className="text-[11px]"
        >
          <option value="interval">Interval</option>
          <option value="chord">Chord</option>
          <option value="fifths">Circle of 5ths</option>
          <option value="geometric">Geometric JI</option>
        </select>

        {/* Key selectors — inline, compact */}
        {harmonyMode !== "fifths" && harmonyMode !== "geometric" && (
          <>
            <div className="h-3 w-px bg-[var(--border)]" />
            <KeySelector
              root={key.root} mode={key.mode}
              onRootChange={(root) => setKey({ ...key, root })}
              onModeChange={(mode) => setKey({ ...key, mode })}
            />
          </>
        )}

        <div className="flex-1" />

        <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)]">Master</span>
        <input type="range" min={0} max={1} step={0.01} value={masterVolume}
          onChange={(e) => { const v = Number(e.target.value); setMasterVolume(v); pipeline.current?.setMasterVolume(v); }}
          className="w-20" />
        <span className="text-[10px] text-[var(--text-dim)] w-5" style={mono}>{Math.round(masterVolume * 100)}</span>

        {!isListening ? (
          <button onClick={start}
            className="px-3 py-0.5 bg-[var(--green)] hover:bg-[var(--green-dim)] text-black rounded text-[10px] font-bold transition-all hover:shadow-[0_0_12px_var(--green-glow)]">
            START
          </button>
        ) : (
          <button onClick={stop}
            className="px-3 py-0.5 bg-[var(--red)] hover:bg-[var(--red-dim)] text-white rounded text-[10px] font-bold transition-all animate-pulse">
            STOP
          </button>
        )}
      </header>

      {error && <p className="text-[var(--red)] text-center text-[10px] py-0.5 bg-[var(--surface-sunken)] shrink-0">{error}</p>}

      {/* ══════ HERO: Pitch + Waveform ══════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
        <div className="w-full max-w-2xl mt-2">
          <Waveform analyser={analyser} />
        </div>
      </div>

      {/* ══════ TAB BAR ══════ */}
      <div className="flex items-center gap-1 px-3 py-1 border-t border-[var(--border-light)] shrink-0">
        {(["harmony", "fx", "range"] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-t text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? "bg-[var(--surface-raised)] text-[var(--amber)] border-t-2 border-[var(--amber)]"
                : "text-[var(--text-dim)] hover:text-[var(--text-mid)]"
            }`}>
            {tab === "harmony" ? "Harmony" : tab === "fx" ? "FX" : "Range"}
          </button>
        ))}
      </div>

      {/* ══════ TAB CONTENT ══════ */}
      <div className="shrink-0 px-3 py-2 bg-[var(--surface-raised)] border-t border-[var(--border)] overflow-y-auto" style={{ maxHeight: "140px" }}>
        <div key={activeTab} className="animate-fade-in">

          {activeTab === "harmony" && (
            <div className="flex flex-col gap-2">
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
          )}

          {activeTab === "fx" && (
            <div className="flex flex-col gap-2">
              <EffectsPanel pipeline={pipeline} />
              <div className="border-t border-[var(--border-light)] pt-2">
                <SmoothingPanel pipeline={pipeline} />
              </div>
            </div>
          )}

          {activeTab === "range" && (
            <div className="flex gap-4">
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
          )}

        </div>
      </div>

      {/* ══════ MIXER STRIP ══════ */}
      <div className="shrink-0 flex items-stretch gap-px h-20 bg-[var(--border-light)] border-t border-[var(--border)]">
        {/* Voice channels */}
        <div className="flex-[6] flex gap-px bg-[var(--border-light)] overflow-x-auto">
          <VoiceEditor pipeline={pipeline} />
        </div>
        {/* Looper + controls */}
        <div className="flex-[4] bg-[var(--surface)] flex items-center gap-3 px-3">
          <LooperControls pipeline={pipeline} />
        </div>
      </div>

    </div>
  );
}
