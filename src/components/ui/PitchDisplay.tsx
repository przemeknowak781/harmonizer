import { useRef } from "react";
import { frequencyToMidi, midiToNoteName, midiToOctave } from "../../engine/pitch";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const serif = { fontFamily: "'DM Serif Display', serif" } as const;

interface PitchDisplayProps {
  frequency: number | null;
  confidence: number;
}

/**
 * Rotary dial pitch display.
 * Uses stroke-dasharray on a circle for the arc — no SVG path math bugs.
 * Needle + arc glow: green (in tune) → amber → red (off).
 *
 * The raw pitch detector jitters by several cents per frame and crosses
 * semitone boundaries during slides — feeding that straight into the
 * needle made it whip between +50 ¢ and −50 ¢ on every other frame. We
 * therefore:
 *   1) Run an EMA on log-frequency for sub-semitone variations (steady
 *      vibrato/jitter is smoothed; a slide of > 0.5 semitone in one tick
 *      snaps so the needle catches up instantly to deliberate notes).
 *   2) Apply hysteresis on the displayed note name: the locked note only
 *      changes when the smoothed pitch is more than 0.55 semitones away
 *      from it, so vibrato around a semitone boundary doesn't flicker
 *      the note name + flip the needle from +50 to −50.
 *   3) Clamp the displayed cents to ±50 so the needle stays in the dial.
 */
const SMOOTH_ALPHA = 0.25;
const SNAP_SEMITONES = 0.5;      // raw→smoothed step that triggers an EMA reset
const LOCK_HYSTERESIS = 0.55;    // smoothed→displayed-note switch threshold

export function PitchDisplay({ frequency, confidence }: PitchDisplayProps) {
  const isActive = !!(frequency && frequency > 0 && confidence >= 0.5);

  const smoothedFreqRef = useRef<number | null>(null);
  const lockedMidiRef = useRef<number | null>(null);

  if (!isActive || !frequency) {
    smoothedFreqRef.current = null;
    lockedMidiRef.current = null;
  } else {
    const prev = smoothedFreqRef.current;
    if (prev === null || prev <= 0) {
      smoothedFreqRef.current = frequency;
    } else {
      const semitoneDiff = Math.abs(12 * Math.log2(frequency / prev));
      if (semitoneDiff > SNAP_SEMITONES) {
        smoothedFreqRef.current = frequency;
      } else {
        const logPrev = Math.log2(prev);
        const logNew = Math.log2(frequency);
        smoothedFreqRef.current = Math.pow(2, logPrev + (logNew - logPrev) * SMOOTH_ALPHA);
      }
    }
  }

  const smoothedFreq = smoothedFreqRef.current;
  let info: { noteName: string; octave: number; centsOffset: number } | null = null;
  if (isActive && smoothedFreq) {
    const rawMidi = frequencyToMidi(smoothedFreq);
    const locked = lockedMidiRef.current;
    let displayMidi: number;
    if (locked === null || Math.abs(rawMidi - locked) > LOCK_HYSTERESIS) {
      displayMidi = Math.round(rawMidi);
      lockedMidiRef.current = displayMidi;
    } else {
      displayMidi = locked;
    }
    const rawCents = Math.round((rawMidi - displayMidi) * 100);
    info = {
      noteName: midiToNoteName(displayMidi),
      octave: midiToOctave(displayMidi),
      centsOffset: Math.max(-50, Math.min(50, rawCents)),
    };
  }


  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 70;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const ARC_FRACTION = 0.667;                  // 240° out of 360°
  const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;
  const GAP_LENGTH = CIRCUMFERENCE - ARC_LENGTH;
  const ROTATION = 150;                         // rotate so gap is at bottom

  const cents = info?.centsOffset ?? 0;

  // Needle: 0¢ = top (12 o'clock), -50¢ = left edge, +50¢ = right edge
  // Arc goes from -120° to +120° (240° span), with 0° = top
  const needleDeg = -90 + (cents / 50) * 120; // -90=top, maps cents to ±120°

  // Active arc: from center (top) to needle
  // Expressed as dasharray length from the arc start
  const centerOffset = ARC_LENGTH / 2;          // center of arc = 0¢
  const needleOffset = centerOffset + (cents / 50) * (ARC_LENGTH / 2);
  const activeStart = Math.min(centerOffset, needleOffset);
  const activeEnd = Math.max(centerOffset, needleOffset);
  const activeLen = activeEnd - activeStart;

  // Color
  const absCents = Math.abs(cents);
  let color: string;
  let glow: string;
  if (!isActive) {
    color = "var(--border)";
    glow = "transparent";
  } else if (absCents <= 5) {
    color = "#50e878";
    glow = "rgba(80, 232, 120, 0.5)";
  } else if (absCents <= 15) {
    color = "#a0d850";
    glow = "rgba(160, 216, 80, 0.35)";
  } else if (absCents <= 30) {
    color = "#f0a030";
    glow = "rgba(240, 160, 48, 0.35)";
  } else {
    color = "#f05050";
    glow = "rgba(240, 80, 80, 0.4)";
  }

  // Needle endpoint
  const needleRad = (needleDeg * Math.PI) / 180;
  const NEEDLE_INNER = 22;
  const NEEDLE_OUTER = R - 6;

  // Tick marks (every 10¢)
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <filter id="glow-f" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Track arc (background) */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={4}
            strokeDasharray={`${ARC_LENGTH} ${GAP_LENGTH}`}
            strokeDashoffset={-GAP_LENGTH / 2}
            strokeLinecap="round"
            transform={`rotate(${ROTATION} ${CX} ${CY})`}
          />

          {/* Active arc (glow layer) */}
          {isActive && activeLen > 0.5 && (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={color}
              strokeWidth={6}
              strokeDasharray={`${activeLen} ${CIRCUMFERENCE - activeLen}`}
              strokeDashoffset={-activeStart - GAP_LENGTH / 2}
              strokeLinecap="round"
              transform={`rotate(${ROTATION} ${CX} ${CY})`}
              filter="url(#glow-f)"
              opacity={0.6}
              style={{ transition: "stroke-dasharray 0.1s, stroke-dashoffset 0.1s, stroke 0.15s" }}
            />
          )}

          {/* Active arc (crisp layer) */}
          {isActive && activeLen > 0.5 && (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={color}
              strokeWidth={5}
              strokeDasharray={`${activeLen} ${CIRCUMFERENCE - activeLen}`}
              strokeDashoffset={-activeStart - GAP_LENGTH / 2}
              strokeLinecap="round"
              transform={`rotate(${ROTATION} ${CX} ${CY})`}
              style={{ transition: "stroke-dasharray 0.1s, stroke-dashoffset 0.1s, stroke 0.15s" }}
            />
          )}

          {/* Tick marks */}
          {ticks.map((tick) => {
            const deg = -90 + (tick / 50) * 120;
            const rad = (deg * Math.PI) / 180;
            const isMajor = tick === 0;
            const innerR = isMajor ? R - 16 : R - 9;
            const outerR = R + 7;
            return (
              <line key={tick}
                x1={CX + innerR * Math.cos(rad)} y1={CY + innerR * Math.sin(rad)}
                x2={CX + outerR * Math.cos(rad)} y2={CY + outerR * Math.sin(rad)}
                stroke={isMajor ? "var(--text-mid)" : "var(--text-dim)"}
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 0.8 : 0.3}
              />
            );
          })}

          {/* Needle (glow) */}
          {isActive && (
            <line
              x1={CX + NEEDLE_INNER * Math.cos(needleRad)}
              y1={CY + NEEDLE_INNER * Math.sin(needleRad)}
              x2={CX + NEEDLE_OUTER * Math.cos(needleRad)}
              y2={CY + NEEDLE_OUTER * Math.sin(needleRad)}
              stroke={color} strokeWidth={4} strokeLinecap="round"
              filter="url(#glow-f)" opacity={0.5}
              style={{ transition: "x1 0.08s, y1 0.08s, x2 0.08s, y2 0.08s, stroke 0.15s" }}
            />
          )}

          {/* Needle (crisp) */}
          <line
            x1={CX + NEEDLE_INNER * Math.cos(needleRad)}
            y1={CY + NEEDLE_INNER * Math.sin(needleRad)}
            x2={CX + NEEDLE_OUTER * Math.cos(needleRad)}
            y2={CY + NEEDLE_OUTER * Math.sin(needleRad)}
            stroke={isActive ? color : "var(--border)"}
            strokeWidth={2.5} strokeLinecap="round"
            style={{ transition: "x1 0.08s, y1 0.08s, x2 0.08s, y2 0.08s, stroke 0.15s" }}
          />

          {/* Center dot */}
          <circle cx={CX} cy={CY} r={4}
            fill={isActive ? color : "var(--border)"}
            style={{
              filter: isActive ? `drop-shadow(0 0 6px ${glow})` : undefined,
              transition: "fill 0.15s",
            }}
          />
        </svg>

        {/* Note name inside dial */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 8 }}>
          <span
            className={`text-4xl font-bold select-none ${isActive ? "" : "opacity-15"}`}
            style={{
              ...serif,
              color: isActive ? color : "var(--border)",
              textShadow: isActive ? `0 0 16px ${glow}` : "none",
              transition: "color 0.15s, text-shadow 0.15s",
            }}
          >
            {info ? `${info.noteName}${info.octave}` : "—"}
          </span>
          {isActive && info && smoothedFreq && (
            <span className="text-[10px] mt-0.5" style={{ ...mono, color: "var(--text-mid)" }}>
              {smoothedFreq.toFixed(1)} Hz
            </span>
          )}
        </div>
      </div>

      {/* Cents readout */}
      {isActive ? (
        <div className="flex items-center gap-2 -mt-3">
          <span className="text-[8px] text-[var(--text-dim)]" style={mono}>-50</span>
          <span className="text-sm font-bold"
            style={{ ...mono, color, textShadow: `0 0 8px ${glow}` }}>
            {cents >= 0 ? "+" : ""}{cents}¢
          </span>
          <span className="text-[8px] text-[var(--text-dim)]" style={mono}>+50</span>
        </div>
      ) : (
        <span className="text-[10px] text-[var(--text-dim)] -mt-3 animate-float" style={mono}>
          waiting for signal...
        </span>
      )}
    </div>
  );
}
