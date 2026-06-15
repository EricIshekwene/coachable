// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import BrowseTile from "../../src/design-system/components/BrowseTile";

describe("BrowseTile", () => {
  it("renders title", () => {
    const { getByText } = render(<BrowseTile color="#f00" icon="★" title="Rugby" />);
    expect(getByText("Rugby")).toBeTruthy();
  });

  it("renders description", () => {
    const { getByText } = render(<BrowseTile color="#f00" icon="★" title="T" description="Desc" />);
    expect(getByText("Desc")).toBeTruthy();
  });

  it("renders count with default label", () => {
    const { getByText } = render(<BrowseTile color="#f00" icon="★" title="T" count={5} />);
    expect(getByText("5 plays")).toBeTruthy();
  });

  it("renders count with custom label", () => {
    const { getByText } = render(<BrowseTile color="#f00" icon="★" title="T" count={1} countLabel="play" />);
    expect(getByText("1 play")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const { getByRole } = render(<BrowseTile color="#f00" icon="★" title="T" onClick={onClick} />);
    fireEvent.click(getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders data-component attribute", () => {
    const { container } = render(<BrowseTile color="#f00" icon="★" title="T" />);
    expect(container.querySelector('[data-component="BrowseTile"]')).toBeTruthy();
  });

  it("applies header background color", () => {
    const { container } = render(<BrowseTile color="rgb(255,0,0)" icon="★" title="T" />);
    const header = container.querySelector('[style*="rgb(255, 0, 0)"]') ||
                   container.querySelector('[style*="rgb(255,0,0)"]');
    expect(header).toBeTruthy();
  });
});
