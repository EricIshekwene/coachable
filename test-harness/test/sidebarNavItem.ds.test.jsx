// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SidebarNavItem from "../../src/design-system/components/SidebarNavItem";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("DS SidebarNavItem (shared barrel)", () => {
  it("renders label", () => {
    const { getByText } = wrap(<SidebarNavItem label="Dashboard" />);
    expect(getByText("Dashboard")).toBeTruthy();
  });

  it("renders as button when no href", () => {
    const { container } = wrap(<SidebarNavItem label="X" />);
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("renders as anchor when href provided", () => {
    const { container } = wrap(<SidebarNavItem label="Home" href="/home" />);
    expect(container.querySelector("a")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const { getByText } = wrap(<SidebarNavItem label="Click me" onClick={onClick} />);
    fireEvent.click(getByText("Click me"));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders badge when provided", () => {
    const { getByText } = wrap(<SidebarNavItem label="Alerts" badge={5} />);
    expect(getByText("5")).toBeTruthy();
  });

  it("has data-component attribute", () => {
    const { container } = wrap(<SidebarNavItem label="X" />);
    expect(container.querySelector('[data-component="SidebarNavItem"]')).toBeTruthy();
  });
});
