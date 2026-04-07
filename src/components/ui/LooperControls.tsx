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
      <h3 className="text-xs text-zinc-500 uppercase tracking-wider">
        Looper
      </h3>

      <div className="flex gap-2 items-center">
        {looperState === "empty" && (
          <button
            onClick={handleRecord}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
          >
            Record
          </button>
        )}

        {looperState === "recording" && (
          <>
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400">Recording...</span>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
            >
              Stop
            </button>
          </>
        )}

        {looperState === "playing" && (
          <>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
            >
              Stop
            </button>
            <button
              onClick={handleOverdub}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition-colors"
            >
              Overdub
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </>
        )}

        {looperState === "overdubbing" && (
          <>
            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm text-orange-400">Overdubbing...</span>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
