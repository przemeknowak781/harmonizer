import { frequencyToPitchInfo } from "../../engine/pitch";

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  if (!frequency || frequency <= 0 || confidence < 0.5) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-2">
        <span className="text-3xl font-bold text-[var(--border)]" style={{ fontFamily: "'DM Serif Display', serif" }}>—</span>
        <div className="w-full h-1 bg-[var(--surface-raised)] rounded-full" />
      </div>
    );
  }

  const info = frequencyToPitchInfo(frequency);
  const centsOffset = info.centsOffset;
  const meterPosition = 50 + centsOffset;

  const centsLabel =
    centsOffset === 0
      ? "0¢"
      : `${centsOffset > 0 ? "+" : ""}${centsOffset}¢`;

  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      <span className="text-3xl font-bold text-[var(--text)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
        {info.noteName}
        {info.octave}
      </span>
      <span className="text-[10px] text-[var(--text-mid)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {frequency.toFixed(1)} Hz · {centsLabel}
      </span>
      <div className="relative w-full h-1 bg-[var(--surface-raised)] rounded-full mt-0.5">
        <div className="absolute top-0 left-1/2 w-px h-full bg-[var(--border)]" />
        <div
          className="absolute top-0 w-2 h-2 -mt-[2px] rounded-full bg-[var(--accent)] transition-all duration-75"
          style={{ left: `${meterPosition}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="flex justify-between w-full text-[9px] text-[var(--text-dim)]">
        <span>-50¢</span>
        <span>+50¢</span>
      </div>
    </div>
  );
}
