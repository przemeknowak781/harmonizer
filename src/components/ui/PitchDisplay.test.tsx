// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PitchDisplay } from "./PitchDisplay";

describe("PitchDisplay", () => {
  it("shows note name when pitch is detected", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    // Two "A4" labels exist now: the detected-note display and the tuning
    // fork button. Pick the big serif display via its class.
    const matches = screen.getAllByText("A4");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((el) => el.className.includes("text-4xl"))).toBe(true);
  });

  it("shows cents offset", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    expect(screen.getByText("+0¢")).toBeInTheDocument();
  });

  it("shows dash when no pitch detected", () => {
    render(<PitchDisplay frequency={null} confidence={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows frequency in Hz", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    expect(screen.getByText(/440/)).toBeInTheDocument();
  });
});
