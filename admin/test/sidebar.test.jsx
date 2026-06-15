// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Sidebar from "../../src/design-system/components/Sidebar";

describe("Sidebar", () => {
  it("renders header slot", () => {
    const { getByText } = render(<Sidebar header={<span>Logo</span>}>nav</Sidebar>);
    expect(getByText("Logo")).toBeTruthy();
  });

  it("renders children", () => {
    const { getByText } = render(<Sidebar header={<span />}>nav content</Sidebar>);
    expect(getByText("nav content")).toBeTruthy();
  });

  it("renders footer when provided", () => {
    const { getByText } = render(
      <Sidebar header={<span />} footer={<span>Footer text</span>}>nav</Sidebar>
    );
    expect(getByText("Footer text")).toBeTruthy();
  });

  it("does not render footer zone when footer prop is absent", () => {
    const { container } = render(<Sidebar header={<span />}>nav</Sidebar>);
    const footerZone = container.querySelector('[style*="borderTop"]');
    expect(footerZone).toBeFalsy();
  });

  it("applies w-52 for sm width", () => {
    const { container } = render(<Sidebar header={<span />} width="sm">nav</Sidebar>);
    expect(container.firstChild.className).toContain("w-52");
  });

  it("applies w-60 for md width (default)", () => {
    const { container } = render(<Sidebar header={<span />}>nav</Sidebar>);
    expect(container.firstChild.className).toContain("w-60");
  });

  it("applies w-72 for lg width", () => {
    const { container } = render(<Sidebar header={<span />} width="lg">nav</Sidebar>);
    expect(container.firstChild.className).toContain("w-72");
  });

  it("renders data-component attribute", () => {
    const { container } = render(<Sidebar header={<span />}>nav</Sidebar>);
    expect(container.querySelector('[data-component="Sidebar"]')).toBeTruthy();
  });
});
