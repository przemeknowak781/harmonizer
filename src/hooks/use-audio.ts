import { useCallback, useRef, useState } from "react";
import {
  createAudioPipeline,
  type AudioPipeline,
} from "../audio/pipeline";
import { useHarmonizerStore } from "../stores/harmonizer-store";
import { PRESETS } from "../engine/presets";

export function useAudio() {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
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
    setPitch,
    setListening,
  } = useHarmonizerStore();

  const start = useCallback(async () => {
    try {
      setError(null);
      const pipeline = await createAudioPipeline(
        (frequency, confidence) => {
          setPitch(frequency > 0 ? frequency : null, confidence);
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
      await pipeline.start();

      pipelineRef.current = pipeline;
      setIsReady(true);
      setListening(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to access microphone",
      );
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
    setPitch,
    setListening,
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
    pipeline.setReverbMix(reverbMix);
    pipeline.setDelayTime(delayTime);
    pipeline.setDelayFeedback(delayFeedback);
    pipeline.setDelayMix(delayMix);
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
  ]);

  return { start, stop, syncSettings, isReady, error, pipeline: pipelineRef };
}
