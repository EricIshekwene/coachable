// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { act } from "react";
import DevOverlay from "../components/DevOverlay/DevOverlay";

describe("DevOverlay", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-dev-overlay");
  });

  test("Ctrl+Shift+D adds data-dev-overlay to documentElement", () => {
    render(<DevOverlay />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "D", bubbles: true })
      );
    });
    expect(document.documentElement).toHaveAttribute("data-dev-overlay");
  });

  test("second Ctrl+Shift+D removes data-dev-overlay (toggle off)", () => {
    render(<DevOverlay />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "D", bubbles: true })
      );
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "D", bubbles: true })
      );
    });
    expect(document.documentElement).not.toHaveAttribute("data-dev-overlay");
  });

  test("non-matching keys do not toggle the overlay", () => {
    render(<DevOverlay />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "D", bubbles: true })
      );
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "D", bubbles: true })
      );
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { shiftKey: true, key: "D", bubbles: true })
      );
    });
    expect(document.documentElement).not.toHaveAttribute("data-dev-overlay");
  });
});
