// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PitchDisplay } from "./PitchDisplay";

describe("PitchDisplay", () => {
  it("shows note name when pitch is detected", () => {
    render(<PitchDisplay frequency={440} confidence={0.95} />);
    expect(screen.getByText("A4")).toBeInTheDocument();
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
