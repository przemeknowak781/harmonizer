import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface TransportBarProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

export function TransportBar({ pipeline }: TransportBarProps) {
  const {
    bpm,
    isTransportPlaying,
    currentBeat,
    setBpm,
    setTransportPlaying,
    setCurrentBeat,
  } = useHarmonizerStore();

  // Poll the transport for beat updates whenever it's playing. This effect
  // covers both manual Play and the pipeline's auto-start — anyone who flips
  // `isTransportPlaying` to true gets the beat indicator moving.
  useEffect(() => {
    if (!isTransportPlaying) return;
    const transport = pipeline.current?.getTransport();
    if (!transport) return;

    transport.onBeat = (beat) => setCurrentBeat(beat);
    const timer = setInterval(() => {
      setCurrentBeat(Math.floor(transport.getCurrentBeat()));
    }, 50);

    return () => {
      clearInterval(timer);
      transport.onBeat = null;
    };
  }, [isTransportPlaying, pipeline, setCurrentBeat]);

  function handlePlay() {
    pipeline.current?.getTransport().start();
    setTransportPlaying(true);
  }

  function handlePause() {
    pipeline.current?.getTransport().pause();
    setTransportPlaying(false);
  }

  function handleStop() {
    pipeline.current?.getTransport().stop();
    setTransportPlaying(false);
    setCurrentBeat(0);
  }

  function handleBpmChange(newBpm: number) {
    setBpm(newBpm);
    pipeline.current?.getTransport().setBpm(newBpm);
  }

  const beatInMeasure = Math.floor(currentBeat) % 4;
  const btn = "px-2 py-0.5 rounded text-[10px] font-bold transition-all";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Transport buttons */}
      <div className="flex gap-1">
        {!isTransportPlaying ? (
          <button onClick={handlePlay}
            className={`${btn} bg-[var(--green)] hover:bg-[var(--green-dim)] text-black hover:shadow-[0_0_10px_var(--green-glow)]`}>
            Play
          </button>
        ) : (
          <button onClick={handlePause}
            className={`${btn} bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]`}>
            Pause
          </button>
        )}
        <button onClick={handleStop}
          className={`${btn} bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]`}>
          Stop
        </button>
      </div>

      {/* BPM */}
      <div className="flex items-center gap-1.5">
        <input type="range" min={30} max={300} step={1} value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-24" />
        <span className="text-[10px] text-[var(--text-mid)] w-8 text-right" style={mono}>{bpm}</span>
      </div>

      {/* Beat indicator */}
      <div className="flex gap-1 items-center">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === beatInMeasure && isTransportPlaying
                ? "bg-[var(--amber)] shadow-[0_0_6px_var(--amber-glow)]"
                : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
