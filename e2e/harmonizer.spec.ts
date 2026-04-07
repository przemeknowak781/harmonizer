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
});
