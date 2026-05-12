/**
 * Preset import / export.
 *
 * Serializes the user-tweakable slice of the store (everything you set with a
 * slider, picker or toggle) to JSON so a setup can be saved, shared, and
 * restored later. Runtime-only fields (pitch readouts, transport beat,
 * looper state, mic state) are deliberately excluded.
 *
 * Versioned for forward-compat — bump PRESET_VERSION when the schema
 * changes incompatibly, and import will refuse mismatched versions rather
 * than silently apply bad data.
 */

import { useHarmonizerStore, type VoiceState } from "../stores/harmonizer-store";
import type { ChordProgression } from "../types/chords";
import type { HarmonyPresetName, KeySignature } from "../types/music";

const PRESET_VERSION = 1;

const EXPORTABLE_FIELDS = [
  "key",
  "presetName",
  "masterVolume",
  "dryVolume",
  "harmonyMode",
  "cofPresetName",
  "rhythmPattern",
  "reverbMix",
  "delayTime",
  "delayFeedback",
  "delayMix",
  "bpm",
  "activeProgression",
  "voiceStates",
  "maxTransposeRatio",
  "minTransposeRatio",
  "stringsEnabled",
  "stringsVolume",
  "stringsBrightness",
  "stringsAttack",
  "orchestraEnabled",
  "orchestraVolume",
  "orchestraPattern",
  "smoothFadeEnabled",
  "fadeTimeMs",
  "portamentoEnabled",
  "portamentoTimeMs",
  "jitterGateCents",
] as const;

type ExportableField = (typeof EXPORTABLE_FIELDS)[number];

export interface ExportedPreset {
  version: number;
  exportedAt: string;
  state: {
    key?: KeySignature;
    presetName?: HarmonyPresetName;
    voiceStates?: VoiceState[];
    activeProgression?: ChordProgression | null;
    [key: string]: unknown;
  };
}

export function exportPreset(): ExportedPreset {
  const state = useHarmonizerStore.getState() as unknown as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};
  for (const key of EXPORTABLE_FIELDS) {
    snapshot[key] = state[key];
  }
  return {
    version: PRESET_VERSION,
    exportedAt: new Date().toISOString(),
    state: snapshot as ExportedPreset["state"],
  };
}

export function importPreset(data: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "Invalid preset file — expected a JSON object" };
  }
  const obj = data as Record<string, unknown>;
  if (obj.version !== PRESET_VERSION) {
    return { ok: false, error: `Unsupported preset version (${String(obj.version)})` };
  }
  if (typeof obj.state !== "object" || obj.state === null) {
    return { ok: false, error: "Invalid preset file — missing 'state'" };
  }

  const state = obj.state as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  for (const key of EXPORTABLE_FIELDS as readonly ExportableField[]) {
    if (key in state && state[key] !== undefined) {
      updates[key] = state[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Preset has no recognized fields" };
  }

  // Single atomic merge — pipeline.syncSettings() should be called afterwards
  // by the caller so the audio side picks up the new values.
  useHarmonizerStore.setState(updates as Partial<ReturnType<typeof useHarmonizerStore.getState>>);
  return { ok: true };
}

/** Trigger a browser download of the current preset as a timestamped JSON file. */
export function downloadPreset(): void {
  const data = exportPreset();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `harmonizer-preset-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Read a user-selected file and apply it to the store. */
export async function uploadPresetFile(
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const text = await file.text();
    const data: unknown = JSON.parse(text);
    return importPreset(data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to read file" };
  }
}
