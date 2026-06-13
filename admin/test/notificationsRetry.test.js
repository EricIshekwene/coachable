// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NotificationsProvider, useNotifications } from "../../src/context/NotificationsContext.jsx";

vi.mock("../../src/utils/notificationsApi.js", () => ({
  fetchNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  submitNotificationResponse: vi.fn(),
}));

import { fetchNotifications } from "../../src/utils/notificationsApi.js";

/**
 * Consumer component that captures the notifications context state into a
 * module-level variable so tests can inspect it after renders.
 */
let capturedState = null;
function Consumer() {
  capturedState = useNotifications();
  return null;
}

describe("NotificationsProvider retry logic", () => {
  let container;
  let root;

  beforeEach(() => {
    vi.useFakeTimers();
    capturedState = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("recovers on second attempt and does not set error", async () => {
    fetchNotifications
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ notifications: [{ id: "n1", readAt: null }] });

    // Mount: triggers the first fetch (which fails)
    await act(async () => {
      root.render(createElement(NotificationsProvider, null, createElement(Consumer)));
    });

    // Advance past the 1 500 ms retry delay so the second attempt fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(fetchNotifications).toHaveBeenCalledTimes(2);
    expect(capturedState.error).toBe("");
    expect(capturedState.loading).toBe(false);
    expect(capturedState.notifications).toHaveLength(1);
  });

  it("recovers on third attempt and does not set error", async () => {
    fetchNotifications
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ notifications: [] });

    await act(async () => {
      root.render(createElement(NotificationsProvider, null, createElement(Consumer)));
    });

    // Advance past two retry delays (1 500 ms each)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(fetchNotifications).toHaveBeenCalledTimes(3);
    expect(capturedState.error).toBe("");
    expect(capturedState.loading).toBe(false);
  });

  it("sets error only after all 3 attempts fail", async () => {
    fetchNotifications.mockRejectedValue(new Error("Failed to fetch"));

    await act(async () => {
      root.render(createElement(NotificationsProvider, null, createElement(Consumer)));
    });

    // Advance past both retry delays
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(fetchNotifications).toHaveBeenCalledTimes(3);
    expect(capturedState.error).toBe("Failed to fetch");
    expect(capturedState.loading).toBe(false);
  });

  it("does not fetch when disabled", async () => {
    await act(async () => {
      root.render(
        createElement(NotificationsProvider, { enabled: false }, createElement(Consumer))
      );
    });

    expect(fetchNotifications).not.toHaveBeenCalled();
    expect(capturedState.loading).toBe(false);
    expect(capturedState.notifications).toHaveLength(0);
  });
});
