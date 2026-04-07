interface VoiceControlProps {
  label: string;
  volume: number;
  pan: number;
  onVolumeChange: (v: number) => void;
  onPanChange: (pan: number) => void;
}

export function VoiceControl({ label, volume, pan, onVolumeChange, onPanChange }: VoiceControlProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 min-w-32">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Pan</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={pan}
          onChange={(e) => onPanChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </label>
    </div>
  );
}
