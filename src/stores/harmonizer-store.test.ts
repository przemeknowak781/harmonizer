import { describe, it, expect, beforeEach } from "vitest";
import { useHarmonizerStore } from "./harmonizer-store";

describe("harmonizer store", () => {
  beforeEach(() => {
    useHarmonizerStore.setState(useHarmonizerStore.getInitialState());
  });

  it("default key is C major", () => {
    const state = useHarmonizerStore.getState();
    expect(state.key.root).toBe("C");
    expect(state.key.mode).toBe("major");
  });

  it("default preset is triad", () => {
    const state = useHarmonizerStore.getState();
    expect(state.presetName).toBe("triad");
  });

  it("setKey updates key", () => {
    useHarmonizerStore.getState().setKey({ root: "D", mode: "natural-minor" });
    const state = useHarmonizerStore.getState();
    expect(state.key.root).toBe("D");
    expect(state.key.mode).toBe("natural-minor");
  });

  it("setPreset updates preset name", () => {
    useHarmonizerStore.getState().setPreset("power");
    expect(useHarmonizerStore.getState().presetName).toBe("power");
  });

  it("setMasterVolume clamps to 0–1", () => {
    useHarmonizerStore.getState().setMasterVolume(1.5);
    expect(useHarmonizerStore.getState().masterVolume).toBe(1);
    useHarmonizerStore.getState().setMasterVolume(-0.5);
    expect(useHarmonizerStore.getState().masterVolume).toBe(0);
  });

  it("setDryVolume clamps to 0–1", () => {
    useHarmonizerStore.getState().setDryVolume(0.7);
    expect(useHarmonizerStore.getState().dryVolume).toBe(0.7);
  });

  it("isListening starts as false", () => {
    expect(useHarmonizerStore.getState().isListening).toBe(false);
  });
});
