// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import Menu from "../../src/design-system/components/Menu";
import MenuItem from "../../src/design-system/components/MenuItem";

function MenuFixture({ open = true, onClose = vi.fn(), placement = "bottom-start" }) {
  const anchorRef = useRef(null);
  return (
    <>
      <button ref={anchorRef} data-testid="trigger">Open</button>
      <Menu open={open} anchorRef={anchorRef} onClose={onClose} placement={placement}>
        <MenuItem onSelect={vi.fn()}>Item One</MenuItem>
        <MenuItem onSelect={vi.fn()}>Item Two</MenuItem>
        <MenuItem disabled onSelect={vi.fn()}>Disabled</MenuItem>
      </Menu>
    </>
  );
}

describe("Menu", () => {
  test("renders children when open", () => {
    render(<MenuFixture open />);
    expect(screen.getByText("Item One")).toBeInTheDocument();
    expect(screen.getByText("Item Two")).toBeInTheDocument();
  });

  test("renders nothing when closed", () => {
    render(<MenuFixture open={false} />);
    expect(screen.queryByText("Item One")).not.toBeInTheDocument();
  });

  test("has role=menu on the panel", () => {
    render(<MenuFixture open />);
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
  });

  test("Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<MenuFixture open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("MenuItem onSelect fires on click", () => {
    const onSelect = vi.fn();
    const anchorRef = { current: document.createElement("button") };
    render(
      <Menu open anchorRef={anchorRef} onClose={vi.fn()}>
        <MenuItem onSelect={onSelect}>Click me</MenuItem>
      </Menu>
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("disabled MenuItem does not fire onSelect on click", () => {
    const onSelect = vi.fn();
    const anchorRef = { current: document.createElement("button") };
    render(
      <Menu open anchorRef={anchorRef} onClose={vi.fn()}>
        <MenuItem disabled onSelect={onSelect}>No-op</MenuItem>
      </Menu>
    );
    fireEvent.click(screen.getByText("No-op"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("disabled MenuItem has aria-disabled", () => {
    const anchorRef = { current: document.createElement("button") };
    render(
      <Menu open anchorRef={anchorRef} onClose={vi.fn()}>
        <MenuItem disabled>No-op</MenuItem>
      </Menu>
    );
    expect(screen.getByText("No-op").closest('[role="menuitem"]')).toHaveAttribute("aria-disabled", "true");
  });

  test("MenuItem has role=menuitem", () => {
    const anchorRef = { current: document.createElement("button") };
    render(
      <Menu open anchorRef={anchorRef} onClose={vi.fn()}>
        <MenuItem>Labeled</MenuItem>
      </Menu>
    );
    expect(screen.getByRole("menuitem", { name: "Labeled" })).toBeInTheDocument();
  });

  test("MenuItem fires on Enter key", () => {
    const onSelect = vi.fn();
    const anchorRef = { current: document.createElement("button") };
    render(
      <Menu open anchorRef={anchorRef} onClose={vi.fn()}>
        <MenuItem onSelect={onSelect}>Press enter</MenuItem>
      </Menu>
    );
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
