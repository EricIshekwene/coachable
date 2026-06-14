// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import Tabs from "../design-system/components/Tabs";

describe("Tabs", () => {
  const items = [
    { value: "plays", label: "Plays" },
    { value: "folders", label: "Folders" },
  ];

  test("clicking a tab calls onChange with its value", () => {
    const onChange = vi.fn();
    render(<Tabs items={items} value="plays" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Folders" }));
    expect(onChange).toHaveBeenCalledWith("folders");
  });

  test("the active tab is aria-selected", () => {
    render(<Tabs items={items} value="folders" />);
    expect(screen.getByRole("tab", { name: "Folders" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Plays" })).toHaveAttribute("aria-selected", "false");
  });
});
