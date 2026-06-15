/** @vitest-environment jsdom */

import { createElement as h } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  Chip,
  Divider,
  EmptyState,
  Spinner,
  Tabs,
} from "../../src/design-system/components";

describe("shared feedback and surface components", () => {
  test("Spinner resolves semantic size and tone", () => {
    render(h(Spinner, { size: "lg", tone: "default", label: "Loading plays" }));
    const spinner = screen.getByRole("status", { name: "Loading plays" });
    expect(spinner.style.width).toBe("32px");
    expect(spinner.style.borderTopColor).toBe("var(--ui-text-muted)");
  });

  test("Alert resolves tone and renders title with children", () => {
    render(h(Alert, { tone: "error", title: "Could not save" }, "Try again."));
    expect(screen.getByText("Could not save").style.color).toBe("var(--ui-danger)");
    expect(screen.getByText("Try again.")).toBeInTheDocument();
  });

  test("EmptyState renders icon, copy, and action", () => {
    render(h(EmptyState, {
      icon: h("span", null, "Icon"),
      title: "No plays",
      description: "Create your first play.",
      action: h("button", { type: "button" }, "Create"),
      contained: true,
    }));
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("No plays")).toBeInTheDocument();
    expect(screen.getByText("Create your first play.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  test("Badge resolves tone, size, and dot", () => {
    const { container } = render(h(Badge, { tone: "success", size: "xs", dot: true }, "Active"));
    const badge = screen.getByText("Active");
    expect(badge).toHaveClass("text-[10px]");
    expect(badge.style.color).toBe("var(--ui-success)");
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  test("Chip exposes selection and a remove button", () => {
    const onRemove = vi.fn();
    render(h(Chip, { selected: true, onRemove }, "Soccer"));
    expect(screen.getByText("Soccer").style.boxShadow).toContain("var(--ui-accent-muted)");
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  test("Avatar renders an image or initials", () => {
    const { rerender } = render(h(Avatar, { src: "/avatar.png", name: "Ada Lovelace" }));
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveAttribute("src", "/avatar.png");
    rerender(h(Avatar, { name: "Ada Lovelace" }));
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  test("Divider exposes separator semantics and strong token", () => {
    render(h(Divider, { tone: "strong" }));
    expect(screen.getByRole("separator")).toHaveStyle({ backgroundColor: "var(--ui-border-strong)" });
  });

  test("Card resolves interactive and selected states", () => {
    render(h(Card, { interactive: true, selected: true }, "Card"));
    const card = screen.getByText("Card");
    expect(card).toHaveClass("cursor-pointer");
    expect(card.style.border).toContain("var(--ui-accent)");
  });

  test("Tabs renders items and marks the active tab", () => {
    render(h(Tabs, {
      items: [{ value: "plays", label: "Plays" }, { value: "folders", label: "Folders" }],
      value: "plays",
    }));
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Plays" })).toHaveAttribute("aria-selected", "true");
  });
});
