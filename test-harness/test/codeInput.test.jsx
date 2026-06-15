// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CodeInput from "../../src/design-system/components/CodeInput";

describe("CodeInput", () => {
  it("renders N boxes", () => {
    const { getAllByRole } = render(<CodeInput length={6} value="" onChange={() => {}} />);
    expect(getAllByRole("textbox").length).toBe(6);
  });

  it("renders custom length", () => {
    const { getAllByRole } = render(<CodeInput length={4} value="" onChange={() => {}} />);
    expect(getAllByRole("textbox").length).toBe(4);
  });

  it("fills boxes from value string", () => {
    const { getAllByRole } = render(<CodeInput length={4} value="1234" onChange={() => {}} />);
    const inputs = getAllByRole("textbox");
    expect(inputs[0].value).toBe("1");
    expect(inputs[1].value).toBe("2");
    expect(inputs[2].value).toBe("3");
    expect(inputs[3].value).toBe("4");
  });

  it("calls onChange when a digit is typed", () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(<CodeInput length={4} value="" onChange={onChange} />);
    fireEvent.change(getAllByRole("textbox")[0], { target: { value: "7" } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toMatch(/^7/);
  });

  it("renders data-component attribute", () => {
    const { container } = render(<CodeInput length={6} value="" onChange={() => {}} />);
    expect(container.querySelector('[data-component="CodeInput"]')).toBeTruthy();
  });

  it("disables inputs when disabled prop set", () => {
    const { getAllByRole } = render(<CodeInput length={4} value="" onChange={() => {}} disabled />);
    getAllByRole("textbox").forEach((input) => {
      expect(input.disabled).toBe(true);
    });
  });
});
