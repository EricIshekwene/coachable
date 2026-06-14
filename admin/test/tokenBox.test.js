import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TokenBox from "../../src/design-system/components/TokenBox";

describe("TokenBox", () => {
  it("renders the value", () => {
    const { getByText } = render(<TokenBox value="ABC-123" />);
    expect(getByText("ABC-123")).toBeTruthy();
  });

  it("renders copy button when copyable", () => {
    const { container } = render(<TokenBox value="ABC-123" copyable />);
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("no copy button when not copyable", () => {
    const { container } = render(<TokenBox value="ABC-123" />);
    expect(container.querySelector("button")).toBeFalsy();
  });

  it("renders data-component attribute", () => {
    const { container } = render(<TokenBox value="x" />);
    expect(container.querySelector('[data-component="TokenBox"]')).toBeTruthy();
  });

  it("renders label when provided", () => {
    const { getByText } = render(<TokenBox value="XYZ" label="Code" />);
    expect(getByText("Code")).toBeTruthy();
  });
});
