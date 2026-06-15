/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
} from "../../src/design-system/components";

describe("shared form controls", () => {
  test("Button resolves variant and size styling", () => {
    render(<Button variant="danger-outline" size="icon">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveClass("h-10", "w-10");
    expect(button.style.color).toBe("var(--ui-danger)");
    expect(button.style.backgroundColor).toBe("transparent");
  });

  test("Button loading disables interaction and preserves spinner content", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("[data-loading-spinner]")).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("Button as renders the requested element", () => {
    render(<Button as="a" href="/plays">Plays</Button>);
    expect(screen.getByRole("link", { name: "Plays" })).toHaveAttribute("href", "/plays");
  });

  test("Input error marks the native input invalid", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
  });

  test("Input label renders a Field wrapper", () => {
    const { container } = render(<Input label="Name" />);
    expect(container.querySelector('[data-component="Field"]')).not.toBeNull();
  });

  test("Field renders label, hint, error, and count states", () => {
    const { rerender } = render(
      <Field label="Name" hint="Public name" count={{ current: 2, max: 20 }}>
        <input id="name" />
      </Field>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Public name")).toBeInTheDocument();
    expect(screen.getByText("2/20")).toBeInTheDocument();

    rerender(<Field error="Required"><input /></Field>);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  test("Toggle resolves checked and disabled state", () => {
    render(<Toggle label="Alerts" checked disabled />);
    const toggle = screen.getByRole("switch", { name: "" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle.style.backgroundColor).toBe("var(--ui-accent)");
  });

  test("Select and Textarea propagate labels and errors", () => {
    render(
      <>
        <Select label="Sport" error="Choose one"><option>Soccer</option></Select>
        <Textarea label="Notes" error="Too long" />
      </>,
    );
    expect(screen.getByLabelText("Sport")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Notes")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
});
