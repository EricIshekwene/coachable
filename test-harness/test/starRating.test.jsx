// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StarRating from "../../src/design-system/components/StarRating";

describe("StarRating", () => {
  it("renders max stars", () => {
    const { getAllByRole } = render(<StarRating value={0} onChange={() => {}} max={5} />);
    expect(getAllByRole("radio").length).toBe(5);
  });

  it("renders custom max stars", () => {
    const { getAllByRole } = render(<StarRating value={0} onChange={() => {}} max={3} />);
    expect(getAllByRole("radio").length).toBe(3);
  });

  it("calls onChange with clicked star number", () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(<StarRating value={0} onChange={onChange} />);
    fireEvent.click(getAllByRole("radio")[2]);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("marks stars as checked when value >= n", () => {
    const { getAllByRole } = render(<StarRating value={3} onChange={() => {}} />);
    const stars = getAllByRole("radio");
    expect(stars[0].getAttribute("aria-checked")).toBe("true");
    expect(stars[1].getAttribute("aria-checked")).toBe("true");
    expect(stars[2].getAttribute("aria-checked")).toBe("true");
    expect(stars[3].getAttribute("aria-checked")).toBe("false");
    expect(stars[4].getAttribute("aria-checked")).toBe("false");
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(<StarRating value={0} onChange={onChange} disabled />);
    fireEvent.click(getAllByRole("radio")[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders data-component attribute", () => {
    const { container } = render(<StarRating value={0} onChange={() => {}} />);
    expect(container.querySelector('[data-component="StarRating"]')).toBeTruthy();
  });
});
