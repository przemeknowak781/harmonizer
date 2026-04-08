import type { MutableRefObject } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { AudioPipeline } from "../../audio/pipeline";

interface LooperControlsProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

export function LooperControls({ pipeline }: LooperControlsProps) {
  const { looperState, setLooperState } = useHarmonizerStore();

  function handleRecord() {
    const looper = pipeline.current?.getLooper();
    if (!looper) return;
    looper.record();
    setLooperState("recording");
  }

  function handleStop() {
    const looper = pipeline.current?.getLooper();
    if (!looper) return;
    looper.stop();
    setLooperState(looper.state);
  }

  function handleOverdub() {
    const looper = pipeline.current?.getLooper();
    if (!looper) return;
    looper.overdub();
    setLooperState("overdubbing");
  }

  function handleClear() {
    const looper = pipeline.current?.getLooper();
    if (!looper) return;
    looper.clear();
    setLooperState("empty");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        {looperState === "empty" && (
          <button
            onClick={handleRecord}
            className="px-3 py-1 bg-[var(--red)] hover:bg-[var(--red-dim)] text-white rounded-lg text-xs font-medium transition-colors"
          >
            Record
          </button>
        )}

        {looperState === "recording" && (
          <>
            <div className="w-3 h-3 rounded-full bg-[var(--red)] animate-pulse" />
            <span className="text-sm text-[var(--red)]">Recording...</span>
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] rounded-lg text-xs font-medium transition-colors"
            >
              Stop
            </button>
          </>
        )}

        {looperState === "playing" && (
          <>
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] rounded-lg text-xs font-medium transition-colors"
            >
              Stop
            </button>
            <button
              onClick={handleOverdub}
              className="px-3 py-1 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white rounded-lg text-xs font-medium transition-colors"
            >
              Overdub
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-mid)] border border-[var(--border)] rounded-lg text-xs font-medium transition-colors"
            >
              Clear
            </button>
          </>
        )}

        {looperState === "overdubbing" && (
          <>
            <div className="w-3 h-3 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-sm text-[var(--accent)]">Overdubbing...</span>
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] rounded-lg text-xs font-medium transition-colors"
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
