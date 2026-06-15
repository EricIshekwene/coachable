// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import IconBubble from "../../src/design-system/components/IconBubble";

describe("IconBubble", () => {
  it("renders with data-component attribute", () => {
    const { container } = render(<IconBubble icon="★" />);
    expect(container.querySelector('[data-component="IconBubble"]')).toBeTruthy();
  });

  it("applies sm size class", () => {
    const { container } = render(<IconBubble icon="★" size="sm" />);
    expect(container.firstChild.className).toContain("h-8");
  });

  it("applies md size class by default", () => {
    const { container } = render(<IconBubble icon="★" />);
    expect(container.firstChild.className).toContain("h-10");
  });

  it("applies lg size class", () => {
    const { container } = render(<IconBubble icon="★" size="lg" />);
    expect(container.firstChild.className).toContain("h-12");
  });

  it("renders icon content", () => {
    const { getByText } = render(<IconBubble icon="★" />);
    expect(getByText("★")).toBeTruthy();
  });
});
