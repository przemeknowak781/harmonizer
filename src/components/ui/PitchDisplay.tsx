import { frequencyToPitchInfo } from "../../engine/pitch";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  const isActive = frequency && frequency > 0 && confidence >= 0.5;

  if (!isActive) {
    return (
      <div className="flex flex-col items-center gap-1 animate-float">
        <span className="text-5xl font-bold text-[var(--border)] select-none" style={serif}>—</span>
        <span className="text-[10px] text-[var(--text-dim)]" style={mono}>waiting for signal...</span>
      </div>
    );
  }

  const info = frequencyToPitchInfo(frequency);
  const centsOffset = info.centsOffset;
  const meterPos = 50 + centsOffset;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Note name — BIG, with glow */}
      <div className="relative">
        <span
          className="text-6xl font-bold text-[var(--amber)] select-none animate-glow inline-block"
          style={{ ...serif, textShadow: "0 0 30px var(--amber-glow-strong)" }}
        >
          {info.noteName}{info.octave}
        </span>
      </div>

      {/* Frequency + cents */}
      <span className="text-xs text-[var(--text-mid)]" style={mono}>
        {frequency.toFixed(1)} Hz
        <span className="mx-1 text-[var(--text-dim)]">&middot;</span>
        <span className={
          centsOffset === 0
            ? "text-[var(--green)]"
            : Math.abs(centsOffset) < 10
              ? "text-[var(--amber)]"
              : "text-[var(--red)]"
        }>
          {centsOffset >= 0 ? "+" : ""}{centsOffset}&cent;
        </span>
      </span>

      {/* Cents meter — full width, subtle */}
      <div className="relative w-full max-w-md h-1 bg-[var(--border)] rounded-full mt-1">
        <div className="absolute top-0 left-1/2 w-px h-full bg-[var(--text-dim)]" />
        <div
          className="absolute top-[-3px] w-2.5 h-2.5 rounded-full bg-[var(--amber)] transition-all duration-100"
          style={{
            left: `${String(meterPos)}%`,
            transform: "translateX(-50%)",
            boxShadow: "0 0 8px var(--amber-glow-strong)",
          }}
        />
      </div>
    </div>
  );
}
