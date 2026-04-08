import { test, expect } from "@playwright/test";

test.describe("Harmonizer", () => {
  test("shows title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Vocal Harmonizer")).toBeVisible();
  });

  test("has start button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });

  test("shows key and mode selectors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.locator("select").nth(1)).toBeVisible();
  });

  test("shows preset buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Triad")).toBeVisible();
    await expect(page.getByText("Power")).toBeVisible();
  });

  test("can change preset", async ({ page }) => {
    await page.goto("/");
    const powerBtn = page.getByRole("button", { name: "Power" });
    await powerBtn.click();
    await expect(powerBtn).toHaveClass(/bg-emerald-600/);
  });

  test("shows master volume slider", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Master")).toBeVisible();
    await expect(page.locator('input[type="range"]').first()).toBeVisible();
  });

  test("can switch to chord harmony mode", async ({ page }) => {
    await page.goto("/");
    const chordBtn = page.getByRole("button", { name: "Chord" });
    await chordBtn.click();
    await expect(chordBtn).toHaveClass(/bg-emerald-600/);
  });

  test("chord progression editor appears in chord mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chord" }).click();
    await expect(page.getByText("Chord Progression")).toBeVisible();
  });

  test("transport bar appears in chord mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chord" }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  });

  test("can change BPM in chord mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chord" }).click();
    await expect(page.getByText("BPM")).toBeVisible();
    const bpmSlider = page.locator('.flex.items-center.gap-2 input[type="range"]');
    await expect(bpmSlider.first()).toBeVisible();
  });

  test("effects panel has reverb and delay controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Effects")).toBeVisible();
    await expect(page.getByText("Reverb")).toBeVisible();
    await expect(page.getByText("Delay", { exact: true })).toBeVisible();
  });

  test("looper shows record button initially", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Looper")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record" })).toBeVisible();
  });

  test("rhythm selector shows patterns", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Simultaneous" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stagger" })).toBeVisible();
  });

  test("switching to interval mode hides chord progression", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Chord" }).click();
    await expect(page.getByText("Chord Progression")).toBeVisible();
    await page.getByRole("button", { name: "Interval" }).click();
    await expect(page.getByText("Chord Progression")).not.toBeVisible();
  });

  test("can switch to Circle of 5ths mode", async ({ page }) => {
    await page.goto("/");
    const cofBtn = page.getByRole("button", { name: "Circle of 5ths" });
    await cofBtn.click();
    await expect(cofBtn).toHaveClass(/bg-emerald-600/);
  });

  test("CoF mode shows CoF presets with amber styling", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Circle of 5ths" }).click();
    await expect(page.getByRole("button", { name: "Pure Fifths" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mirror" })).toBeVisible();
  });

  test("CoF mode hides key/scale selectors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Circle of 5ths" }).click();
    // Key/mode selectors should not be visible in fifths mode
    await expect(page.locator("select")).toHaveCount(0);
  });

  test("can select CoF preset", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Circle of 5ths" }).click();
    const mirrorBtn = page.getByRole("button", { name: "Mirror" });
    await mirrorBtn.click();
    await expect(mirrorBtn).toHaveClass(/bg-amber-600/);
  });

  test("switching from CoF to Interval restores key selectors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Circle of 5ths" }).click();
    await expect(page.locator("select")).toHaveCount(0);
    await page.getByRole("button", { name: "Interval" }).click();
    await expect(page.locator("select").first()).toBeVisible();
  });
});
