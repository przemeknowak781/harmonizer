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

export function MainLayout() {
  const {
    key,
    presetName,
    masterVolume,
    currentPitch,
    currentConfidence,
    isListening,
    harmonyMode,
    setKey,
    setPreset,
    setMasterVolume,
  } = useHarmonizerStore();

  const { start, stop, syncSettings, isReady: _isReady, error, pipeline } = useAudio();

  useEffect(() => {
    syncSettings();
  }, [key, presetName, syncSettings]);

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

        {/* Harmony Mode Selector */}
        <section>
          <HarmonyModeSelector />
        </section>

        {/* Key & Preset + Rhythm Selector */}
        <section className="flex flex-col gap-4">
          {harmonyMode === "fifths" ? (
            <CofPresetSelector />
          ) : harmonyMode === "geometric" ? null : (
            <>
              <KeySelector
                root={key.root}
                mode={key.mode}
                onRootChange={(root) => setKey({ ...key, root })}
                onModeChange={(mode) => setKey({ ...key, mode })}
              />
              <PresetSelector value={presetName} onChange={setPreset} />
              <RhythmSelector />
            </>
          )}
        </section>

        {/* Chord Progression Editor (chord + geometric modes) */}
        {(harmonyMode === "chord" || harmonyMode === "geometric") && (
          <section>
            <ChordProgressionEditor />
          </section>
        )}

        {/* Transport Bar (chord + geometric modes) */}
        {(harmonyMode === "chord" || harmonyMode === "geometric") && (
          <section>
            <TransportBar pipeline={pipeline} />
          </section>
        )}

        {/* Voice Controls */}
        <section>
          <VoiceEditor pipeline={pipeline} />
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

        {/* Effects Panel */}
        <section>
          <EffectsPanel pipeline={pipeline} />
        </section>

        {/* Looper Controls */}
        <section>
          <LooperControls pipeline={pipeline} />
        </section>

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
