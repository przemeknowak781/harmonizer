import { useEffect } from "react";
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
import { StringsPanel } from "../ui/StringsPanel";
import { OrchestraPanel } from "../ui/OrchestraPanel";
import { StylePicker } from "../ui/StylePicker";
import { PresetIO } from "../ui/PresetIO";
import { useAutoRestart } from "../../hooks/use-auto-restart";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

export function MainLayout() {
  const {
    key, presetName, masterVolume, maxTransposeRatio, minTransposeRatio,
    currentPitch, currentConfidence, isListening, harmonyMode,
    setKey, setPreset, setMasterVolume, setMaxTransposeRatio, setMinTransposeRatio,
    setHarmonyMode,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, isReady: _isReady, error, pipeline } = useAudio();

  useEffect(() => { syncSettings(); }, [key, presetName, harmonyMode, syncSettings]);

  // Auto-start on first interaction + clean stop/start cycle when key, preset
  // or harmony mode changes (so all internal pipeline state refreshes — e.g.
  // voice leader, autotuner, smoothed ratios — instead of carrying over).
  useAutoRestart({
    signature: `${key.root}|${key.mode}|${presetName}|${harmonyMode}`,
    start,
    stop,
  });

  const analyser = pipeline.current?.getAnalyserNode() ?? null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">

      {/* ══ TOOLBAR ══ */}
      <header className="flex items-center gap-2 px-3 h-9 bg-[var(--surface)] border-b border-[var(--border-light)] shrink-0">
        <span className="text-xs font-bold tracking-tight opacity-50" style={serif}>Harmonizer</span>
        <div className="h-3 w-px bg-[var(--border)]" />
        <select value={harmonyMode}
          onChange={(e) => setHarmonyMode(e.target.value as "interval" | "chord" | "fifths" | "geometric")}>
          <option value="interval">Interval</option>
          <option value="chord">Chord</option>
          <option value="fifths">Circle of 5ths</option>
          <option value="geometric">Geometric JI</option>
          <option value="adaptive">Adaptive</option>
        </select>
        {harmonyMode !== "fifths" && harmonyMode !== "geometric" && harmonyMode !== "adaptive" && (
          <>
            <div className="h-3 w-px bg-[var(--border)]" />
            <KeySelector root={key.root} mode={key.mode}
              onRootChange={(root) => setKey({ ...key, root })}
              onModeChange={(mode) => setKey({ ...key, mode })} />
          </>
        )}
        <div className="flex-1" />
        <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)]">Master</span>
        <input type="range" min={0} max={1} step={0.01} value={masterVolume}
          onChange={(e) => { const v = Number(e.target.value); setMasterVolume(v); pipeline.current?.setMasterVolume(v); }}
          className="w-24" />
        <span className="text-[10px] text-[var(--text-dim)] w-5" style={mono}>{Math.round(masterVolume * 100)}</span>
        {/* Mic status toggle — replaces the big START/STOP. Mic auto-starts on the
            first user gesture; this small icon lets the user pause / resume. */}
        <button
          onClick={isListening ? stop : start}
          title={isListening ? "Stop microphone" : "Start microphone"}
          aria-label={isListening ? "Stop microphone" : "Start microphone"}
          className={`flex items-center gap-1.5 px-2 h-6 rounded text-[10px] font-bold transition-all ${
            isListening
              ? "bg-[var(--red)] text-white hover:bg-[var(--red-dim)]"
              : "bg-[var(--surface-raised)] text-[var(--text-mid)] hover:text-[var(--amber)] hover:bg-[var(--border)]"
          }`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isListening ? "bg-white animate-pulse" : "bg-[var(--text-dim)]"
            }`}
          />
          {isListening ? "LIVE" : "MIC"}
        </button>
      </header>

      {error && <p className="text-[var(--red)] text-center text-[10px] py-0.5 shrink-0">{error}</p>}

      {/* ══ MAIN: 3-column console ══ */}
      <div className="flex-1 flex min-h-0">

        {/* ── LEFT: Voices + Looper ── */}
        <div className="w-52 shrink-0 bg-[var(--surface)] border-r border-[var(--border-light)] flex flex-col p-2 gap-2 overflow-y-auto">
          <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)]">Voices</span>
          <VoiceEditor pipeline={pipeline} />
          <div className="mt-auto pt-2 border-t border-[var(--border-light)]">
            <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)] mb-1 block">Looper</span>
            <LooperControls pipeline={pipeline} />
          </div>
        </div>

        {/* ── CENTER: Pitch Hero + Config ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">

          {/* Pitch + Waveform — hero area */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0 relative">
            <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
            <div className="w-full max-w-xl mt-2">
              <Waveform analyser={analyser} />
            </div>

            {/* Big, prominent MIC CTA shown when mic is off — the primary
                entry point. Auto-start on first interaction still works for
                power users who go straight for a slider/style chip. */}
            {!isListening && (
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] bg-[var(--bg)]/40 z-10">
                <button
                  onClick={start}
                  aria-label="Start microphone"
                  className="flex flex-col items-center gap-3 px-12 py-8 rounded-3xl bg-[var(--green)] text-black font-bold shadow-[0_0_40px_var(--green-glow)] hover:scale-105 active:scale-95 transition-transform animate-pulse"
                >
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="2" width="6" height="13" rx="3" />
                    <path d="M5 11 a7 7 0 0 0 14 0" />
                    <path d="M12 18 v3" />
                    <path d="M8 21 h8" />
                  </svg>
                  <span className="text-base tracking-wider">TAP TO START</span>
                </button>
              </div>
            )}
          </div>

          {/* Config strip — below pitch, always visible */}
          <div className="shrink-0 px-3 py-2 bg-[var(--surface)] border-t border-[var(--border-light)] flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "45%" }}>
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)] w-12 shrink-0">Style</span>
              <div className="flex-1 min-w-0">
                <StylePicker onApply={syncSettings} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)] w-12 shrink-0">Preset</span>
              <div className="flex-1 min-w-0">
                <PresetIO onApply={syncSettings} />
              </div>
            </div>
            {harmonyMode === "adaptive" ? (
              <div className="text-[10px] text-[var(--text-dim)] italic py-1">
                Adaptive mode — harmony follows your melody automatically
              </div>
            ) : harmonyMode === "fifths" ? (
              <CofPresetSelector />
            ) : harmonyMode !== "geometric" ? (
              <>
                <PresetSelector value={presetName} onChange={setPreset} />
                <RhythmSelector />
              </>
            ) : null}

            {(harmonyMode === "chord" || harmonyMode === "geometric") && (
              <div className="flex flex-col gap-1">
                <ChordProgressionEditor />
                <TransportBar pipeline={pipeline} />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Strings + Effects + Smoothing + Range ── */}
        <div className="w-56 shrink-0 bg-[var(--surface)] border-l border-[var(--border-light)] flex flex-col p-2 gap-3 overflow-y-auto">
          <div>
            <OrchestraPanel pipeline={pipeline} />
          </div>

          <div className="border-t border-[var(--border-light)] pt-2">
            <StringsPanel pipeline={pipeline} />
          </div>

          <div className="border-t border-[var(--border-light)] pt-2">
            <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)] mb-1 block">Effects</span>
            <EffectsPanel pipeline={pipeline} />
          </div>

          <div className="border-t border-[var(--border-light)] pt-2">
            <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)] mb-1 block">Smoothing</span>
            <SmoothingPanel pipeline={pipeline} />
          </div>

          <div className="border-t border-[var(--border-light)] pt-2">
            <span className="text-[8px] uppercase tracking-widest text-[var(--text-dim)] mb-1 block">Transpose Range</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[var(--text-dim)] w-4">Lo</span>
                <input type="range" min={0.125} max={1} step={0.125}
                  value={minTransposeRatio}
                  onChange={(e) => { const v = Number(e.target.value); setMinTransposeRatio(v); pipeline.current?.setMinTransposeRatio(v); }}
                  className="flex-1" />
                <span className="text-[9px] text-[var(--text-dim)] w-5 text-right" style={mono}>
                  {minTransposeRatio >= 0.5 ? "-1" : minTransposeRatio >= 0.25 ? "-2" : "-3"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[var(--text-dim)] w-4">Hi</span>
                <input type="range" min={1} max={8} step={0.5}
                  value={maxTransposeRatio}
                  onChange={(e) => { const v = Number(e.target.value); setMaxTransposeRatio(v); pipeline.current?.setMaxTransposeRatio(v); }}
                  className="flex-1" />
                <span className="text-[9px] text-[var(--text-dim)] w-5 text-right" style={mono}>
                  +{maxTransposeRatio <= 2 ? "1" : maxTransposeRatio <= 4 ? "2" : "3+"}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
