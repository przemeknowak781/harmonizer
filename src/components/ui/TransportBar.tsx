import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";
import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { AudioPipeline } from "../../audio/pipeline";

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
    // Poll beat for smooth UI
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

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Transport buttons */}
      <div className="flex gap-2">
        {!isTransportPlaying ? (
          <button
            onClick={handlePlay}
            className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Play
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="px-3 py-1.5 bg-[var(--surface-alt)] hover:bg-[var(--border-light)] text-[var(--text)] border border-[var(--border-light)] rounded-lg text-sm font-medium transition-colors"
          >
            Pause
          </button>
        )}
        <button
          onClick={handleStop}
          className="px-3 py-1.5 bg-[var(--surface-alt)] hover:bg-[var(--border-light)] text-[var(--text)] border border-[var(--border-light)] rounded-lg text-sm font-medium transition-colors"
        >
          Stop
        </button>
      </div>

      {/* BPM slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-light)] uppercase tracking-wider">
          BPM
        </span>
        <input
          type="range"
          min={30}
          max={300}
          step={1}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-28"
        />
        <span className="text-sm text-[var(--text)] w-8 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {bpm}
        </span>
      </div>

      {/* Beat indicator */}
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === beatInMeasure && isTransportPlaying
                ? "bg-[var(--accent)]"
                : "bg-[var(--border-light)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
