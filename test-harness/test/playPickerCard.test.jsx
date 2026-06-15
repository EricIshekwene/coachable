// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayPickerCard from "../../src/components/PlayPickerCard";

const play = { id: "1", title: "Test Play", description: "A play", tags: ["rugby", "defense"] };

describe("PlayPickerCard", () => {
  it("renders title", () => {
    const { getByText } = render(<PlayPickerCard play={play} added={false} onAdd={() => {}} />);
    expect(getByText("Test Play")).toBeTruthy();
  });
  it("renders tags", () => {
    const { getByText } = render(<PlayPickerCard play={play} added={false} onAdd={() => {}} />);
    expect(getByText("rugby")).toBeTruthy();
  });
  it("renders add button when onAdd provided", () => {
    const { getByRole } = render(<PlayPickerCard play={play} added={false} onAdd={() => {}} />);
    expect(getByRole("button")).toBeTruthy();
  });
  it("calls onAdd when add button clicked", () => {
    const onAdd = vi.fn();
    const { getAllByRole } = render(<PlayPickerCard play={play} added={false} onAdd={onAdd} />);
    const buttons = getAllByRole("button");
    // The add button is the last button (the card itself is a div, not a button)
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onAdd).toHaveBeenCalled();
  });
  it("shows Added state when added=true", () => {
    const { getByText } = render(<PlayPickerCard play={play} added={true} onAdd={() => {}} />);
    expect(getByText("Added to Playbook")).toBeTruthy();
  });
  it("renders data-component attribute", () => {
    const { container } = render(<PlayPickerCard play={play} added={false} onAdd={() => {}} />);
    expect(container.querySelector('[data-component="PlayPickerCard"]')).toBeTruthy();
  });
  it("no add button when onAdd not provided", () => {
    const { queryAllByRole } = render(<PlayPickerCard play={play} added={false} />);
    expect(queryAllByRole("button").length).toBe(0);
  });
});
