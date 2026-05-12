import { useCallback, useRef, useState } from "react";
import {
  createAudioPipeline,
  type AudioPipeline,
} from "../audio/pipeline";
import { useHarmonizerStore } from "../stores/harmonizer-store";
import { PRESETS } from "../engine/presets";

export function useAudio() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  // Guards against double-start when the big MIC button is clicked and the
  // auto-start `pointerdown` capture-listener fires on the same gesture —
  // without this, two pipelines would be created and the first would leak.
  const startingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    key,
    presetName,
    masterVolume,
    dryVolume,
    harmonyMode,
    cofPresetName,
    rhythmPattern,
    reverbMix,
    delayTime,
    delayFeedback,
    delayMix,
    bpm,
    activeProgression,
    voiceStates,
    maxTransposeRatio,
    minTransposeRatio,
    stringsEnabled,
    stringsVolume,
    stringsBrightness,
    stringsAttack,
    orchestraEnabled,
    orchestraVolume,
    orchestraPattern,
    smoothFadeEnabled,
    fadeTimeMs,
    portamentoEnabled,
    portamentoTimeMs,
    jitterGateCents,
    setPitch,
    setListening,
    setTransportPlaying,
  } = useHarmonizerStore();

  const start = useCallback(async () => {
    if (startingRef.current || pipelineRef.current) return;
    startingRef.current = true;
    try {
      setError(null);
      const pipeline = await createAudioPipeline(
        (frequency, confidence) => {
          setPitch(frequency > 0 ? frequency : null, confidence);
        },
        (playing) => {
          setTransportPlaying(playing);
        },
      );

      pipeline.updateHarmony(key.root, key.mode, PRESETS[presetName]);
      pipeline.setHarmonyMode(harmonyMode);
      pipeline.setCofPreset(cofPresetName);
      pipeline.setChordProgression(activeProgression);
      pipeline.setRhythmPattern(rhythmPattern, bpm);
      pipeline.setReverbMix(reverbMix);
      pipeline.setDelayTime(delayTime);
      pipeline.setDelayFeedback(delayFeedback);
      pipeline.setDelayMix(delayMix);
      pipeline.setMaxTransposeRatio(maxTransposeRatio);
      pipeline.setMinTransposeRatio(minTransposeRatio);
      pipeline.setStringsEnabled(stringsEnabled);
      pipeline.setStringsVolume(stringsVolume);
      pipeline.setStringsBrightness(stringsBrightness);
      pipeline.setStringsAttack(stringsAttack);
      pipeline.setSmoothConfig({
        fadeEnabled: smoothFadeEnabled,
        fadeMs: fadeTimeMs,
        portamentoEnabled: portamentoEnabled,
        portamentoMs: portamentoTimeMs,
        jitterCents: jitterGateCents,
      });
      pipeline.setCustomCofVoices(voiceStates.map((v) => ({
        steps: v.cofSteps,
        octaveReduce: v.cofOctaveReduce,
        volume: v.volume,
        pan: v.pan,
        active: v.active,
        octaveShift: v.octaveShift,
      })));
      for (let i = 0; i < voiceStates.length; i++) {
        const vs = voiceStates[i];
        if (vs) {
          pipeline.setVoiceVolume(i, vs.active ? vs.volume : 0);
          pipeline.setVoicePan(i, vs.pan);
        }
      }
      await pipeline.start();

      pipelineRef.current = pipeline;
      setIsReady(true);
      setListening(true);

      // Auto-load orchestra in the background if the store says it should
      // be enabled (e.g. on first launch the default is on with Tremolo at
      // 0.72 vol). The mic is already live by the time samples arrive, so
      // there's no perceived start latency.
      if (orchestraEnabled) {
        pipeline.loadOrchestra()
          .then(() => {
            pipeline.setOrchestraVolume(orchestraVolume);
            pipeline.setOrchestraPattern(orchestraPattern);
            pipeline.setOrchestraEnabled(true);
          })
          .catch((e) => console.warn("Orchestra autoload failed:", e));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to access microphone",
      );
    } finally {
      startingRef.current = false;
    }
  }, [
    key,
    presetName,
    harmonyMode,
    cofPresetName,
    rhythmPattern,
    reverbMix,
    delayTime,
    delayFeedback,
    delayMix,
    bpm,
    activeProgression,
    voiceStates,
    maxTransposeRatio,
    minTransposeRatio,
    stringsEnabled,
    stringsVolume,
    stringsBrightness,
    stringsAttack,
    orchestraEnabled,
    orchestraVolume,
    orchestraPattern,
    smoothFadeEnabled,
    fadeTimeMs,
    portamentoEnabled,
    portamentoTimeMs,
    jitterGateCents,
    setPitch,
    setListening,
    setTransportPlaying,
  ]);

  const stop = useCallback(() => {
    pipelineRef.current?.destroy();
    pipelineRef.current = null;
    setIsReady(false);
    setListening(false);
    setPitch(null, 0);
  }, [setListening, setPitch]);

  const syncSettings = useCallback(() => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    pipeline.updateHarmony(key.root, key.mode, PRESETS[presetName]);
    pipeline.setHarmonyMode(harmonyMode);
    pipeline.setCofPreset(cofPresetName);
    pipeline.setChordProgression(activeProgression);
    pipeline.setRhythmPattern(rhythmPattern, bpm);
    pipeline.setMasterVolume(masterVolume);
    pipeline.setDryVolume(dryVolume);
    pipeline.setReverbMix(reverbMix);
    pipeline.setDelayTime(delayTime);
    pipeline.setDelayFeedback(delayFeedback);
    pipeline.setDelayMix(delayMix);
    pipeline.setMaxTransposeRatio(maxTransposeRatio);
    pipeline.setMinTransposeRatio(minTransposeRatio);
    pipeline.setSmoothConfig({
      fadeEnabled: smoothFadeEnabled,
      fadeMs: fadeTimeMs,
      portamentoEnabled: portamentoEnabled,
      portamentoMs: portamentoTimeMs,
      jitterCents: jitterGateCents,
    });
    pipeline.setStringsEnabled(stringsEnabled);
    pipeline.setStringsVolume(stringsVolume);
    pipeline.setStringsBrightness(stringsBrightness);
    pipeline.setStringsAttack(stringsAttack);
    // Orchestra: push current desired enable/volume/pattern to the pipeline.
    // Loading is owned by useAudio.start (and the OrchestraPanel handles
    // explicit user toggles); here we just keep an already-loaded pipeline in
    // step with the store.
    if (pipeline.isOrchestraLoaded()) {
      pipeline.setOrchestraEnabled(orchestraEnabled);
      pipeline.setOrchestraVolume(orchestraVolume);
      pipeline.setOrchestraPattern(orchestraPattern);
    }
    pipeline.setCustomCofVoices(voiceStates.map((v) => ({
      steps: v.cofSteps,
      octaveReduce: v.cofOctaveReduce,
      volume: v.volume,
      pan: v.pan,
      active: v.active,
      octaveShift: v.octaveShift,
    })));
    for (let i = 0; i < voiceStates.length; i++) {
      const vs = voiceStates[i];
      if (vs) {
        pipeline.setVoiceVolume(i, vs.active ? vs.volume : 0);
        pipeline.setVoicePan(i, vs.pan);
      }
    }
  }, [
    key,
    presetName,
    masterVolume,
    dryVolume,
    harmonyMode,
    cofPresetName,
    rhythmPattern,
    reverbMix,
    delayTime,
    delayFeedback,
    delayMix,
    bpm,
    activeProgression,
    voiceStates,
    maxTransposeRatio,
    minTransposeRatio,
    stringsEnabled,
    stringsVolume,
    stringsBrightness,
    stringsAttack,
    orchestraEnabled,
    orchestraVolume,
    orchestraPattern,
    smoothFadeEnabled,
    fadeTimeMs,
    portamentoEnabled,
    portamentoTimeMs,
    jitterGateCents,
  ]);

  /**
   * Synchronous in-place reset used when the user switches style / preset /
   * key / harmony mode. The previous implementation did `stop() + start()`,
   * which (a) briefly flipped `isListening` false — flashing the big START
   * overlay — and (b) raced when a second restart arrived while the first
   * was still awaiting `getUserMedia`, dropping the second start's settings.
   * `softReset` resets the pipeline's harmony engines and silences the wet
   * channels without touching the AudioContext; `syncSettings` then pushes
   * the current store values back in.
   */
  const resetState = useCallback(() => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    pipeline.softReset();
    syncSettings();
  }, [syncSettings]);

  return { start, stop, syncSettings, resetState, isReady, error, pipeline: pipelineRef };
}
