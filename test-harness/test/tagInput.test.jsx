// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TagInput from "../../src/design-system/components/TagInput";

describe("TagInput", () => {
  it("renders data-component attribute", () => {
    const { container } = render(<TagInput value={[]} onChange={() => {}} />);
    expect(container.querySelector('[data-component="TagInput"]')).toBeTruthy();
  });

  it("adds tag on Enter", () => {
    const onChange = vi.fn();
    const { container } = render(<TagInput value={[]} onChange={onChange} />);
    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "rugby" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["rugby"]);
  });

  it("adds tag on comma key", () => {
    const onChange = vi.fn();
    const { container } = render(<TagInput value={[]} onChange={onChange} />);
    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "football" } });
    fireEvent.keyDown(input, { key: "," });
    expect(onChange).toHaveBeenCalledWith(["football"]);
  });

  it("does not add duplicate tags", () => {
    const onChange = vi.fn();
    const { container } = render(<TagInput value={["rugby"]} onChange={onChange} />);
    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "rugby" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("respects maxTags limit", () => {
    const onChange = vi.fn();
    const { container } = render(<TagInput value={["a", "b"]} onChange={onChange} maxTags={2} />);
    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "c" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes last tag on Backspace when input is empty", () => {
    const onChange = vi.fn();
    const { container } = render(<TagInput value={["rugby", "soccer"]} onChange={onChange} />);
    const input = container.querySelector("input");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith(["rugby"]);
  });

  it("shows filtered suggestions when input matches", () => {
    const { container, getByText } = render(
      <TagInput value={[]} onChange={() => {}} suggestions={["rugby", "football", "soccer"]} />
    );
    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "rug" } });
    expect(getByText("rugby")).toBeTruthy();
  });
});
