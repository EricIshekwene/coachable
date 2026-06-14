import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import InlineEdit from "../../src/design-system/components/InlineEdit";

describe("InlineEdit", () => {
  it("renders with data-component attribute", () => {
    const { container } = render(<InlineEdit value="hello" onCommit={() => {}} onCancel={() => {}} />);
    expect(container.querySelector('[data-component="InlineEdit"]')).toBeTruthy();
  });

  it("calls onCommit on Enter", () => {
    const onCommit = vi.fn();
    const { getByRole } = render(<InlineEdit value="hello" onCommit={onCommit} onCancel={() => {}} />);
    const input = getByRole("textbox");
    fireEvent.change(input, { target: { value: "world" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith("world");
  });

  it("calls onCancel on Escape", () => {
    const onCancel = vi.fn();
    const { getByRole } = render(<InlineEdit value="hello" onCommit={() => {}} onCancel={onCancel} />);
    fireEvent.keyDown(getByRole("textbox"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCommit on blur", () => {
    const onCommit = vi.fn();
    const { getByRole } = render(<InlineEdit value="hello" onCommit={onCommit} onCancel={() => {}} />);
    fireEvent.blur(getByRole("textbox"));
    expect(onCommit).toHaveBeenCalledWith("hello");
  });

  it("shows initial value", () => {
    const { getByRole } = render(<InlineEdit value="initial" onCommit={() => {}} onCancel={() => {}} />);
    expect(getByRole("textbox").value).toBe("initial");
  });
});
