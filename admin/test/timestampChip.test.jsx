// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TimestampChip from "../../src/design-system/components/TimestampChip";

describe("TimestampChip", () => {
  it("renders children", () => {
    const { getByText } = render(<TimestampChip>2 days ago</TimestampChip>);
    expect(getByText("2 days ago")).toBeTruthy();
  });

  it("renders data-component attribute", () => {
    const { container } = render(<TimestampChip>now</TimestampChip>);
    expect(container.querySelector('[data-component="TimestampChip"]')).toBeTruthy();
  });

  it("renders as a span element", () => {
    const { container } = render(<TimestampChip>5m ago</TimestampChip>);
    expect(container.querySelector("span[data-component]")).toBeTruthy();
  });
});
