// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import QuestionCard from "../../src/design-system/components/QuestionCard";

describe("QuestionCard", () => {
  it("renders number in bubble", () => {
    const { getByText } = render(<QuestionCard number={3} label="Rate it"><div /></QuestionCard>);
    expect(getByText("3")).toBeTruthy();
  });

  it("renders label", () => {
    const { getByText } = render(<QuestionCard number={1} label="How was it?"><div /></QuestionCard>);
    expect(getByText("How was it?")).toBeTruthy();
  });

  it("renders asterisk when required", () => {
    const { container } = render(<QuestionCard number={1} label="Q" required><div /></QuestionCard>);
    expect(container.textContent).toContain("*");
  });

  it("no asterisk when not required", () => {
    const { container } = render(<QuestionCard number={1} label="Q"><div /></QuestionCard>);
    expect(container.textContent).not.toContain("*");
  });

  it("renders children in content area", () => {
    const { getByText } = render(
      <QuestionCard number={1} label="Q"><span>answer field</span></QuestionCard>
    );
    expect(getByText("answer field")).toBeTruthy();
  });

  it("renders data-component attribute", () => {
    const { container } = render(<QuestionCard number={1} label="Q"><div /></QuestionCard>);
    expect(container.querySelector('[data-component="QuestionCard"]')).toBeTruthy();
  });
});
