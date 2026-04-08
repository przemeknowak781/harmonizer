import { frequencyToPitchInfo } from "../../engine/pitch";

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  if (!frequency || frequency <= 0 || confidence < 0.5) {
    return (
      <div className="flex flex-col items-center gap-2 p-6">
        <span className="text-6xl font-bold text-[var(--border)]" style={{ fontFamily: "'DM Serif Display', serif" }}>—</span>
        <div className="w-64 h-2 bg-[var(--surface-alt)] rounded-full" />
      </div>
    );
  }

  const info = frequencyToPitchInfo(frequency);
  const centsOffset = info.centsOffset;
  const meterPosition = 50 + centsOffset; // 0–100, 50 = center

  const centsLabel =
    centsOffset === 0
      ? "0¢"
      : `${centsOffset > 0 ? "+" : ""}${centsOffset}¢`;

  return (
    <div className="flex flex-col items-center gap-2 p-6">
      <span className="text-6xl font-bold text-[var(--text)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
        {info.noteName}
        {info.octave}
      </span>
      <span className="text-sm text-[var(--text-muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{frequency.toFixed(1)} Hz</span> · <span>{centsLabel}</span>
      </span>
      <div className="relative w-64 h-2 bg-[var(--surface-alt)] rounded-full">
        <div className="absolute top-0 left-1/2 w-px h-full bg-[var(--border)]" />
        <div
          className="absolute top-0 w-3 h-3 -mt-0.5 rounded-full bg-[var(--accent)] transition-all duration-75"
          style={{ left: `${meterPosition}%`, transform: "translateX(-50%)", boxShadow: "0 1px 4px rgba(200, 117, 51, 0.3)" }}
        />
      </div>
      <div className="flex justify-between w-64 text-xs text-[var(--text-light)]">
        <span>-50¢</span>
        <span>+50¢</span>
      </div>
    </div>
  );
}
