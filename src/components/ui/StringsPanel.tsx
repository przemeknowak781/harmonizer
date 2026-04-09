import { useHarmonizerStore } from "../../stores/harmonizer-store";
import type { MutableRefObject } from "react";
import type { AudioPipeline } from "../../audio/pipeline";

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface StringsPanelProps {
  pipeline: MutableRefObject<AudioPipeline | null>;
}

export function StringsPanel({ pipeline }: StringsPanelProps) {
  const {
    stringsEnabled, stringsVolume, stringsBrightness, stringsAttack,
    setStringsEnabled, setStringsVolume, setStringsBrightness, setStringsAttack,
  } = useHarmonizerStore();

  return (
    <div className="flex flex-col gap-1.5">
      {/* Enable toggle */}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={stringsEnabled}
          onChange={(e) => {
            setStringsEnabled(e.target.checked);
            pipeline.current?.setStringsEnabled(e.target.checked);
          }} />
        <span className="text-[10px] font-bold text-[var(--text-mid)] uppercase tracking-wider">
          Strings
        </span>
        {stringsEnabled && (
          <span className="text-[8px] text-[var(--green)] ml-auto" style={mono}>ON</span>
        )}
      </div>

      {stringsEnabled && (
        <>
          {/* Volume */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text-dim)] w-10">Vol</span>
            <input type="range" min={0} max={1} step={0.01} value={stringsVolume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStringsVolume(v);
                pipeline.current?.setStringsVolume(v);
              }}
              className="flex-1" />
            <span className="text-[9px] text-[var(--text-dim)] w-6 text-right" style={mono}>
              {Math.round(stringsVolume * 100)}
            </span>
          </div>

          {/* Brightness (LPF) */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text-dim)] w-10">Tone</span>
            <input type="range" min={0} max={1} step={0.01} value={stringsBrightness}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStringsBrightness(v);
                pipeline.current?.setStringsBrightness(v);
              }}
              className="flex-1" />
            <span className="text-[9px] text-[var(--text-dim)] w-6 text-right" style={mono}>
              {stringsBrightness < 0.3 ? "warm" : stringsBrightness > 0.7 ? "brt" : "mid"}
            </span>
          </div>

          {/* Attack */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text-dim)] w-10">Atk</span>
            <input type="range" min={0.01} max={1} step={0.01} value={stringsAttack}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStringsAttack(v);
                pipeline.current?.setStringsAttack(v);
              }}
              className="flex-1" />
            <span className="text-[9px] text-[var(--text-dim)] w-6 text-right" style={mono}>
              {Math.round(stringsAttack * 1000)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
