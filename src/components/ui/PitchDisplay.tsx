import { frequencyToPitchInfo } from "../../engine/pitch";

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  if (!frequency || frequency <= 0 || confidence < 0.5) {
    return (
      <div className="flex flex-col items-center gap-1 py-3">
        <span className="text-4xl font-bold text-[var(--border)]" style={{ fontFamily: "'DM Serif Display', serif" }}>—</span>
        <div className="w-full h-1.5 bg-[var(--surface-alt)] rounded-full" />
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
    <div className="flex flex-col items-center gap-1 py-3">
      <span className="text-4xl font-bold text-[var(--text)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
        {info.noteName}
        {info.octave}
      </span>
      <span className="text-[11px] text-[var(--text-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {frequency.toFixed(1)} Hz · {centsLabel}
      </span>
      <div className="relative w-full h-1.5 bg-[var(--surface-alt)] rounded-full mt-1">
        <div className="absolute top-0 left-1/2 w-px h-full bg-[var(--border)]" />
        <div
          className="absolute top-0 w-2.5 h-2.5 -mt-[2px] rounded-full bg-[var(--accent)] transition-all duration-75"
          style={{ left: `${meterPosition}%`, transform: "translateX(-50%)", boxShadow: "0 1px 3px rgba(200, 117, 51, 0.3)" }}
        />
      </div>
      <div className="flex justify-between w-full text-[9px] text-[var(--text-light)]">
        <span>-50¢</span>
        <span>+50¢</span>
      </div>
    </div>
  );
}
