import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";
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

  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handlePlay() {
    const transport = pipeline.current?.getTransport();
    if (!transport) return;
    transport.onBeat = (beat) => setCurrentBeat(beat);
    transport.start();
    setTransportPlaying(true);
    beatTimerRef.current = setInterval(() => {
      setCurrentBeat(Math.floor(transport.getCurrentBeat()));
    }, 50);
  }

  function handlePause() {
    const transport = pipeline.current?.getTransport();
    if (!transport) return;
    transport.pause();
    setTransportPlaying(false);
    if (beatTimerRef.current) {
      clearInterval(beatTimerRef.current);
      beatTimerRef.current = null;
    }
  }

  function handleStop() {
    const transport = pipeline.current?.getTransport();
    if (!transport) return;
    transport.stop();
    setTransportPlaying(false);
    setCurrentBeat(0);
    if (beatTimerRef.current) {
      clearInterval(beatTimerRef.current);
      beatTimerRef.current = null;
    }
  }

  function handleBpmChange(newBpm: number) {
    setBpm(newBpm);
    pipeline.current?.getTransport().setBpm(newBpm);
  }

  useEffect(() => {
    return () => {
      if (beatTimerRef.current) {
        clearInterval(beatTimerRef.current);
      }
    };
  }, []);

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
