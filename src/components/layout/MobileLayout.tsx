import { useEffect, useState, type ReactElement } from "react";
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

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

type TabId = "voices" | "harmony" | "fx" | "sound" | "loop" | "more";

const TABS: { id: TabId; label: string; icon: ReactElement }[] = [
  {
    id: "voices",
    label: "Voices",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h2l2-7 4 14 3-10 2 6h5" />
      </svg>
    ),
  },
  {
    id: "harmony",
    label: "Harmony",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
      </svg>
    ),
  },
  {
    id: "fx",
    label: "FX",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14a4 4 0 1 1 8 0M12 14a4 4 0 1 0 8 0" />
        <path d="M4 14v3M20 14v3" />
      </svg>
    ),
  },
  {
    id: "sound",
    label: "Sound",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: "loop",
    label: "Loop",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    id: "more",
    label: "More",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </svg>
    ),
  },
];

export function MobileLayout() {
  const {
    key, presetName, masterVolume, maxTransposeRatio, minTransposeRatio,
    currentPitch, currentConfidence, isListening, harmonyMode,
    setKey, setPreset, setMasterVolume, setMaxTransposeRatio, setMinTransposeRatio,
    setHarmonyMode,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, error, pipeline } = useAudio();
  const [activeTab, setActiveTab] = useState<TabId>("voices");

  useEffect(() => { syncSettings(); }, [key, presetName, harmonyMode, syncSettings]);

  const analyser = pipeline.current?.getAnalyserNode() ?? null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[var(--bg)]">

      {/* ══ HEADER ══ */}
      <header className="safe-top shrink-0 px-4 pt-2 pb-3 bg-[var(--surface)] border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-bold tracking-tight" style={serif}>
            Harmonizer
          </span>
          {!isListening ? (
            <button
              onClick={start}
              className="px-4 py-2 bg-[var(--green)] hover:bg-[var(--green-dim)] active:scale-95 text-black rounded-full text-xs font-bold transition-all shadow-[0_0_16px_var(--green-glow)]"
              style={{ minHeight: 36 }}
            >
              ▶ START
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-4 py-2 bg-[var(--red)] hover:bg-[var(--red-dim)] active:scale-95 text-white rounded-full text-xs font-bold transition-all animate-pulse"
              style={{ minHeight: 36 }}
            >
              ■ STOP
            </button>
          )}
        </div>

        {/* Master volume strip */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] w-12">
            Master
          </span>
          <input
            type="range" min={0} max={1} step={0.01} value={masterVolume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMasterVolume(v);
              pipeline.current?.setMasterVolume(v);
            }}
            className="flex-1"
          />
          <span className="text-xs text-[var(--text-mid)] w-8 text-right" style={mono}>
            {Math.round(masterVolume * 100)}
          </span>
        </div>

        {error && (
          <p className="text-[var(--red)] text-center text-xs pt-2">{error}</p>
        )}
      </header>

      {/* ══ HERO: pitch display ══ */}
      <div className="shrink-0 flex flex-col items-center justify-center pt-3 pb-2 px-4">
        <PitchDisplay frequency={currentPitch} confidence={currentConfidence} />
        <div className="w-full max-w-md mt-2">
          <Waveform analyser={analyser} />
        </div>
      </div>

      {/* ══ TAB CONTENT ══ */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-2">
        {activeTab === "voices" && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <span className="mobile-section-title">Harmony Voices</span>
            <VoiceEditor pipeline={pipeline} />
          </div>
        )}

        {activeTab === "harmony" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="mobile-card flex flex-col gap-3">
              <span className="mobile-section-title">Mode</span>
              <select
                value={harmonyMode}
                onChange={(e) =>
                  setHarmonyMode(e.target.value as "interval" | "chord" | "fifths" | "geometric")
                }
                className="w-full text-sm"
              >
                <option value="interval">Interval (scale-based)</option>
                <option value="chord">Chord progression</option>
                <option value="fifths">Circle of 5ths</option>
                <option value="geometric">Geometric JI</option>
                <option value="adaptive">Adaptive (auto)</option>
              </select>
            </div>

            {harmonyMode !== "fifths" && harmonyMode !== "geometric" && harmonyMode !== "adaptive" && (
              <div className="mobile-card flex flex-col gap-3">
                <span className="mobile-section-title">Key & Scale</span>
                <KeySelector
                  root={key.root}
                  mode={key.mode}
                  onRootChange={(root) => setKey({ ...key, root })}
                  onModeChange={(mode) => setKey({ ...key, mode })}
                />
              </div>
            )}

            {harmonyMode === "adaptive" && (
              <div className="mobile-card">
                <p className="text-xs text-[var(--text-mid)] italic leading-relaxed">
                  Adaptive mode — harmony follows your melody automatically. Just sing.
                </p>
              </div>
            )}

            {harmonyMode === "fifths" && (
              <div className="mobile-card flex flex-col gap-3">
                <span className="mobile-section-title">CoF Preset</span>
                <CofPresetSelector />
              </div>
            )}

            {harmonyMode !== "fifths" && harmonyMode !== "geometric" && harmonyMode !== "adaptive" && (
              <>
                <div className="mobile-card flex flex-col gap-3">
                  <span className="mobile-section-title">Preset</span>
                  <PresetSelector value={presetName} onChange={setPreset} />
                </div>
                <div className="mobile-card flex flex-col gap-3">
                  <span className="mobile-section-title">Rhythm</span>
                  <RhythmSelector />
                </div>
              </>
            )}

            {(harmonyMode === "chord" || harmonyMode === "geometric") && (
              <>
                <div className="mobile-card flex flex-col gap-3">
                  <span className="mobile-section-title">Chord Progression</span>
                  <ChordProgressionEditor />
                </div>
                <div className="mobile-card flex flex-col gap-3">
                  <span className="mobile-section-title">Transport</span>
                  <TransportBar pipeline={pipeline} />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "fx" && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="mobile-card flex flex-col gap-3">
              <span className="mobile-section-title">Effects</span>
              <EffectsPanel pipeline={pipeline} />
            </div>
            <div className="mobile-card flex flex-col gap-3">
              <span className="mobile-section-title">Smoothing</span>
              <SmoothingPanel pipeline={pipeline} />
            </div>
          </div>
        )}

        {activeTab === "sound" && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="mobile-card flex flex-col gap-3">
              <OrchestraPanel pipeline={pipeline} />
            </div>
            <div className="mobile-card flex flex-col gap-3">
              <StringsPanel pipeline={pipeline} />
            </div>
          </div>
        )}

        {activeTab === "loop" && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="mobile-card flex flex-col gap-3">
              <span className="mobile-section-title">Looper</span>
              <LooperControls pipeline={pipeline} />
              <p className="text-[10px] text-[var(--text-dim)] leading-relaxed mt-1">
                Record your dry voice, then play it back with harmonies generated live. Overdub layers more parts.
              </p>
            </div>
          </div>
        )}

        {activeTab === "more" && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="mobile-card flex flex-col gap-3">
              <span className="mobile-section-title">Transpose Range</span>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-mid)]">Low limit</span>
                  <span className="text-xs text-[var(--amber)]" style={mono}>
                    {minTransposeRatio >= 0.5 ? "−1 oct" : minTransposeRatio >= 0.25 ? "−2 oct" : "−3 oct"}
                  </span>
                </div>
                <input
                  type="range" min={0.125} max={1} step={0.125} value={minTransposeRatio}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMinTransposeRatio(v);
                    pipeline.current?.setMinTransposeRatio(v);
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-mid)]">High limit</span>
                  <span className="text-xs text-[var(--amber)]" style={mono}>
                    {maxTransposeRatio <= 2 ? "+1 oct" : maxTransposeRatio <= 4 ? "+2 oct" : "+3 oct"}
                  </span>
                </div>
                <input
                  type="range" min={1} max={8} step={0.5} value={maxTransposeRatio}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMaxTransposeRatio(v);
                    pipeline.current?.setMaxTransposeRatio(v);
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mobile-card">
              <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
                <strong className="text-[var(--text-mid)]">Tip:</strong> 100% client-side. Your voice never leaves the device.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ══ BOTTOM TAB BAR ══ */}
      <nav
        className="shrink-0 grid grid-cols-6 bg-[var(--surface)] border-t border-[var(--border-light)] safe-bottom"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className="mobile-tab-btn"
            data-active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
