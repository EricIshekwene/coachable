import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AccordionItem from "../../src/design-system/components/AccordionItem";

describe("AccordionItem", () => {
  it("renders data-component attribute", () => {
    const { container } = render(<AccordionItem title="Q">Answer</AccordionItem>);
    expect(container.querySelector('[data-component="AccordionItem"]')).toBeTruthy();
  });

  it("starts closed by default", () => {
    const { container } = render(<AccordionItem title="Q">Answer</AccordionItem>);
    expect(container.querySelector(".max-h-0")).toBeTruthy();
  });

  it("opens on click", () => {
    const { container, getByRole } = render(<AccordionItem title="Q">Answer</AccordionItem>);
    fireEvent.click(getByRole("button"));
    expect(container.querySelector(".max-h-\\[72rem\\]")).toBeTruthy();
  });

  it("closes again on second click", () => {
    const { container, getByRole } = render(<AccordionItem title="Q">Answer</AccordionItem>);
    fireEvent.click(getByRole("button"));
    fireEvent.click(getByRole("button"));
    expect(container.querySelector(".max-h-0")).toBeTruthy();
  });

  it("starts open when defaultOpen is true", () => {
    const { container } = render(<AccordionItem title="Q" defaultOpen>Answer</AccordionItem>);
    expect(container.querySelector(".max-h-\\[72rem\\]")).toBeTruthy();
  });

  it("renders title text", () => {
    const { getByText } = render(<AccordionItem title="My Title">Body</AccordionItem>);
    expect(getByText("My Title")).toBeTruthy();
  });

  it("renders actions slot when open", () => {
    const { getByText, getByRole } = render(
      <AccordionItem title="Q" actions={<button>Watch</button>}>Answer</AccordionItem>
    );
    fireEvent.click(getByRole("button", { name: /Q/ }));
    expect(getByText("Watch")).toBeTruthy();
  });
});
