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

  const btn = "px-2 py-0.5 rounded text-[10px] font-bold transition-all";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {looperState === "empty" && (
        <button onClick={handleRecord}
          className={`${btn} bg-[var(--red)] hover:bg-[var(--red-dim)] text-white hover:shadow-[0_0_10px_var(--red-glow)]`}>
          Rec
        </button>
      )}

      {looperState === "recording" && (
        <>
          <div className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
          <span className="text-[9px] text-[var(--red)]">REC</span>
          <button onClick={handleStop}
            className={`${btn} bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]`}>
            Stop
          </button>
        </>
      )}

      {looperState === "playing" && (
        <>
          <button onClick={handleStop}
            className={`${btn} bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]`}>
            Stop
          </button>
          <button onClick={handleOverdub}
            className={`${btn} bg-[var(--amber)] hover:bg-[var(--amber-dim)] text-black hover:shadow-[0_0_10px_var(--amber-glow)]`}>
            Dub
          </button>
          <button onClick={handleClear}
            className={`${btn} bg-[var(--surface-raised)] text-[var(--text-mid)] border border-[var(--border)] hover:bg-[var(--border)]`}>
            Clear
          </button>
        </>
      )}

      {looperState === "overdubbing" && (
        <>
          <div className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse" />
          <span className="text-[9px] text-[var(--amber)]">DUB</span>
          <button onClick={handleStop}
            className={`${btn} bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]`}>
            Stop
          </button>
        </>
      )}
    </div>
  );
}
