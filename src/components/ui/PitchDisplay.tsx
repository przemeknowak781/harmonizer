import { frequencyToPitchInfo } from "../../engine/pitch";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

/**
 * Rotary dial pitch display.
 * SVG arc rotates based on cents offset (-50 to +50).
 * Glow color: green (in tune) → amber (close) → red (off).
 */
export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  const isActive = frequency && frequency > 0 && confidence >= 0.5;

  // Dial geometry
  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 72;               // main arc radius
  const STROKE = 5;
  const ARC_SPAN = 240;       // degrees of arc sweep
  const ARC_START = -210;     // start angle (left of top)

  // Compute needle angle: 0¢ = top center, ±50¢ = edges
  const cents = isActive ? frequencyToPitchInfo(frequency).centsOffset : 0;
  const info = isActive ? frequencyToPitchInfo(frequency) : null;
  const needleAngle = ARC_START + (ARC_SPAN / 2) + (cents / 50) * (ARC_SPAN / 2);

  // Color based on accuracy
  const absCents = Math.abs(cents);
  let color: string;
  let glowColor: string;
  let glowIntensity: number;
  if (!isActive) {
    color = "var(--border)";
    glowColor = "transparent";
    glowIntensity = 0;
  } else if (absCents <= 5) {
    color = "#50e878";          // bright green — in tune
    glowColor = "rgba(80, 232, 120, 0.4)";
    glowIntensity = 1;
  } else if (absCents <= 15) {
    color = "#a0d850";          // yellow-green — close
    glowColor = "rgba(160, 216, 80, 0.3)";
    glowIntensity = 0.7;
  } else if (absCents <= 30) {
    color = "var(--amber)";     // amber — off
    glowColor = "var(--amber-glow-strong)";
    glowIntensity = 0.5;
  } else {
    color = "var(--red)";       // red — very off
    glowColor = "rgba(240, 80, 80, 0.4)";
    glowIntensity = 0.6;
  }

  // SVG arc path helper
  function arcPath(radius: number, startDeg: number, endDeg: number): string {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const x1 = CX + radius * Math.cos(startRad);
    const y1 = CY + radius * Math.sin(startRad);
    const x2 = CX + radius * Math.cos(endRad);
    const y2 = CY + radius * Math.sin(endRad);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Needle endpoint
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleInner = 20;
  const needleOuter = R - 8;
  const nx1 = CX + needleInner * Math.cos(needleRad);
  const ny1 = CY + needleInner * Math.sin(needleRad);
  const nx2 = CX + needleOuter * Math.cos(needleRad);
  const ny2 = CY + needleOuter * Math.sin(needleRad);

  // Tick marks
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            {/* Glow filter */}
            <filter id="dial-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background arc (track) */}
          <path
            d={arcPath(R, ARC_START, ARC_START + ARC_SPAN)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {ticks.map((tick) => {
            const angle = ARC_START + (ARC_SPAN / 2) + (tick / 50) * (ARC_SPAN / 2);
            const rad = (angle * Math.PI) / 180;
            const isMajor = tick === 0;
            const isMinor = tick % 10 === 0;
            const innerR = isMajor ? R - 14 : isMinor ? R - 10 : R - 7;
            const outerR = R + 6;
            return (
              <line
                key={tick}
                x1={CX + innerR * Math.cos(rad)}
                y1={CY + innerR * Math.sin(rad)}
                x2={CX + outerR * Math.cos(rad)}
                y2={CY + outerR * Math.sin(rad)}
                stroke={isMajor ? "var(--text-mid)" : "var(--border)"}
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 1 : 0.5}
              />
            );
          })}

          {/* Active arc segment (from center to current position) */}
          {isActive && (
            <path
              d={arcPath(R, ARC_START + ARC_SPAN / 2, needleAngle > ARC_START + ARC_SPAN / 2
                ? needleAngle
                : ARC_START + ARC_SPAN / 2)}
              fill="none"
              stroke={color}
              strokeWidth={STROKE + 1}
              strokeLinecap="round"
              filter="url(#dial-glow)"
              style={{ transition: "d 0.1s ease-out" }}
            />
          )}
          {/* Mirror arc for negative cents */}
          {isActive && cents < 0 && (
            <path
              d={arcPath(R, needleAngle, ARC_START + ARC_SPAN / 2)}
              fill="none"
              stroke={color}
              strokeWidth={STROKE + 1}
              strokeLinecap="round"
              filter="url(#dial-glow)"
            />
          )}

          {/* Needle */}
          <line
            x1={nx1} y1={ny1}
            x2={nx2} y2={ny2}
            stroke={isActive ? color : "var(--border)"}
            strokeWidth={2.5}
            strokeLinecap="round"
            filter={isActive ? "url(#needle-glow)" : undefined}
            style={{ transition: "all 0.08s ease-out" }}
          />

          {/* Center dot */}
          <circle
            cx={CX} cy={CY} r={4}
            fill={isActive ? color : "var(--border)"}
            style={{
              filter: isActive ? `drop-shadow(0 0 ${6 * glowIntensity}px ${glowColor})` : undefined,
              transition: "fill 0.15s",
            }}
          />
        </svg>

        {/* Note name — centered in dial */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: "10px" }}>
          <span
            className={`text-4xl font-bold select-none ${isActive ? "" : "opacity-20"}`}
            style={{
              ...serif,
              color: isActive ? color : "var(--border)",
              textShadow: isActive ? `0 0 20px ${glowColor}` : "none",
              transition: "color 0.15s, text-shadow 0.15s",
            }}
          >
            {info ? `${info.noteName}${info.octave}` : "—"}
          </span>
          {isActive && info && (
            <span className="text-[10px] mt-0.5" style={{ ...mono, color: "var(--text-mid)" }}>
              {frequency.toFixed(1)} Hz
            </span>
          )}
        </div>
      </div>

      {/* Cents readout below dial */}
      {isActive && (
        <div className="flex items-center gap-2 -mt-2">
          <span className="text-[9px] text-[var(--text-dim)]" style={mono}>-50</span>
          <span
            className="text-sm font-bold"
            style={{ ...mono, color, textShadow: `0 0 8px ${glowColor}` }}
          >
            {cents >= 0 ? "+" : ""}{cents}¢
          </span>
          <span className="text-[9px] text-[var(--text-dim)]" style={mono}>+50</span>
        </div>
      )}
      {!isActive && (
        <span className="text-[10px] text-[var(--text-dim)] -mt-2 animate-float" style={mono}>
          waiting for signal...
        </span>
      )}
    </div>
  );
}
