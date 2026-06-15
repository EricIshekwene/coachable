// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RecentlyEditedChip from "../../src/design-system/components/RecentlyEditedChip";

describe("RecentlyEditedChip", () => {
  it("renders title and time", () => {
    const { getByText } = render(
      <RecentlyEditedChip title="Zone Press" time="2 days ago" onClick={() => {}} />
    );
    expect(getByText("Zone Press")).toBeTruthy();
    expect(getByText("2 days ago")).toBeTruthy();
  });

  it("renders data-component attribute", () => {
    const { container } = render(
      <RecentlyEditedChip title="Play" time="1h ago" onClick={() => {}} />
    );
    expect(container.querySelector('[data-component="RecentlyEditedChip"]')).toBeTruthy();
  });

  it("renders as a button element", () => {
    const { container } = render(
      <RecentlyEditedChip title="Play" time="1h ago" onClick={() => {}} />
    );
    expect(container.querySelector("button[data-component]")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    const { container } = render(
      <RecentlyEditedChip title="Play" time="1h ago" onClick={handleClick} />
    );
    fireEvent.click(container.querySelector("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("applies extra className", () => {
    const { container } = render(
      <RecentlyEditedChip title="Play" time="1h ago" onClick={() => {}} className="extra-class" />
    );
    expect(container.querySelector("button").className).toContain("extra-class");
  });
});
