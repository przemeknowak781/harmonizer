import { useEffect, useRef } from "react";
import { useHarmonizerStore } from "../stores/harmonizer-store";

interface UseAutoRestartParams {
  /**
   * Serialized signature of the fields that should trigger an in-place reset
   * when they change (e.g. `${key.root}|${key.mode}|${preset}|${mode}`).
   * Different value than the previous render = reset.
   */
  signature: string;
  start: () => Promise<void> | void;
  /**
   * Called synchronously whenever the signature changes while the mic is
   * live. The previous implementation did `stop() + start()` here, but that
   * (a) flashed the big START overlay during the destroy/recreate gap and
   * (b) raced on rapid switches because the second start was dropped by the
   * `startingRef` guard while the first was still awaiting getUserMedia.
   * An in-place reset side-steps both bugs.
   */
  onReset: () => void;
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
 *  2. **Reset pipeline on key/preset/mode change.** When the user switches
 *     style or preset, the pipeline's internal harmony state (voice leader,
 *     autotuner, smoothed ratios) is reset in place via `onReset` so the
 *     new harmony engine config takes effect cleanly. Synchronous + safe to
 *     fire repeatedly (idempotent), so rapid style switches all land.
 */
export function useAutoRestart({ signature, start, onReset }: UseAutoRestartParams) {
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

    onReset();
  }, [signature, onReset]);
}
