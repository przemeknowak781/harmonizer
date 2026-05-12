import { useEffect, useRef } from "react";
import { useHarmonizerStore } from "../stores/harmonizer-store";

interface UseAutoRestartParams {
  /**
   * A serialized signature of the fields that should trigger a full pipeline
   * restart when they change (e.g. `${key.root}|${key.mode}|${preset}|${mode}`).
   * Different value than the previous render = restart cycle.
   */
  signature: string;
  start: () => Promise<void> | void;
  stop: () => void;
}

/**
 * Two responsibilities collapsed into one hook to remove the legacy "click
 * START first" UX:
 *
 *  1. **Auto-start on first user interaction.** Browsers require a user
 *     gesture before `getUserMedia` / `AudioContext.resume`, so we attach a
 *     one-shot `pointerdown` listener (capture phase). The first time anyone
 *     touches the page, we kick off `start()` if the mic isn't already live.
 *     After that first fire the listener is removed; subsequent state
 *     transitions (manual start/stop via the mic toggle) take over.
 *
 *  2. **Restart pipeline on key/preset/mode change.** The user reported that
 *     some sliders don't refresh after switching modes or presets — even
 *     though `syncSettings` runs, the pipeline's internal state can carry
 *     over stale values. Doing a `stop() + start()` cycle (debounced 50 ms
 *     to coalesce multi-field updates from `applyStyle`) gives a clean slate.
 */
export function useAutoRestart({ signature, start, stop }: UseAutoRestartParams) {
  const autoStartTriggeredRef = useRef(false);
  const lastSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoStartTriggeredRef.current) return;

    const handler = () => {
      if (autoStartTriggeredRef.current) return;
      autoStartTriggeredRef.current = true;
      document.removeEventListener("pointerdown", handler, true);
      if (!useHarmonizerStore.getState().isListening) {
        void start();
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [start]);

  useEffect(() => {
    if (lastSigRef.current === null) {
      lastSigRef.current = signature;
      return;
    }
    if (lastSigRef.current === signature) return;
    lastSigRef.current = signature;

    if (!useHarmonizerStore.getState().isListening) return;

    const timer = setTimeout(() => {
      stop();
      void start();
    }, 50);
    return () => clearTimeout(timer);
  }, [signature, start, stop]);
}
