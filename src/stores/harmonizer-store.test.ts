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

  it("default harmonyMode is chord", () => {
    expect(useHarmonizerStore.getState().harmonyMode).toBe("chord");
  });

  it("default rhythmPattern is simultaneous", () => {
    expect(useHarmonizerStore.getState().rhythmPattern).toBe("simultaneous");
  });

  it("default effects values", () => {
    const state = useHarmonizerStore.getState();
    expect(state.reverbMix).toBe(0);
    expect(state.delayTime).toBe(300);
    expect(state.delayFeedback).toBe(0.3);
    expect(state.delayMix).toBe(0);
  });

  it("default looper and transport values", () => {
    const state = useHarmonizerStore.getState();
    expect(state.looperState).toBe("empty");
    expect(state.bpm).toBe(120);
    expect(state.isTransportPlaying).toBe(false);
    expect(state.currentBeat).toBe(0);
    expect(state.activeProgression).toBeNull();
  });

  it("setReverbMix clamps to 0–1", () => {
    useHarmonizerStore.getState().setReverbMix(1.5);
    expect(useHarmonizerStore.getState().reverbMix).toBe(1);
    useHarmonizerStore.getState().setReverbMix(-0.2);
    expect(useHarmonizerStore.getState().reverbMix).toBe(0);
  });

  it("setDelayFeedback clamps to 0–0.9", () => {
    useHarmonizerStore.getState().setDelayFeedback(1.0);
    expect(useHarmonizerStore.getState().delayFeedback).toBe(0.9);
  });

  it("setBpm clamps to 30–300", () => {
    useHarmonizerStore.getState().setBpm(10);
    expect(useHarmonizerStore.getState().bpm).toBe(30);
    useHarmonizerStore.getState().setBpm(500);
    expect(useHarmonizerStore.getState().bpm).toBe(300);
  });
});
