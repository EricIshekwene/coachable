// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "../../src/context/AuthContext.jsx";

vi.mock("../../src/utils/api.js", () => ({
  apiFetch: vi.fn(),
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
}));

vi.mock("../../src/utils/errorReporter.js", () => ({
  setErrorReporterUserId: vi.fn(),
}));

import { apiFetch } from "../../src/utils/api.js";

/** Build an error shaped like apiFetch's createApiError output. */
function apiError(code, status = 0) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Consumer component that captures the auth context state into a
 * module-level variable so tests can inspect it after renders.
 */
let capturedState = null;
function Consumer() {
  capturedState = useAuth();
  return null;
}

describe("AuthProvider session bootstrap retry logic", () => {
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

  async function mount() {
    await act(async () => {
      root.render(createElement(AuthProvider, null, createElement(Consumer)));
    });
  }

  it("retries a network failure and restores the session on the second attempt", async () => {
    apiFetch
      .mockRejectedValueOnce(apiError("network_error"))
      .mockResolvedValueOnce({ user: { id: "u1", name: "Coach", email: "c@x.com" }, allTeams: [] });

    await mount();

    // Still loading after the first failed attempt — the user must NOT be
    // treated as logged out while retries are pending.
    expect(capturedState.loading).toBe(true);
    expect(capturedState.user).toBeNull();

    // Advance past the 1 000 ms retry delay so the second attempt fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(capturedState.loading).toBe(false);
    expect(capturedState.user?.id).toBe("u1");
  });

  it("treats an HTTP response (401) as definitive and does not retry", async () => {
    apiFetch.mockRejectedValue(apiError("http_error", 401));

    await mount();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(capturedState.loading).toBe(false);
    expect(capturedState.user).toBeNull();
  });

  it("settles as logged out after all 3 network attempts fail", async () => {
    apiFetch.mockRejectedValue(apiError("network_error"));

    await mount();

    // Advance past both retry delays (1 000 ms + 2 000 ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(apiFetch).toHaveBeenCalledTimes(3);
    expect(capturedState.loading).toBe(false);
    expect(capturedState.user).toBeNull();
  });

  it("suppresses network error reports on every attempt except the last", async () => {
    apiFetch.mockRejectedValue(apiError("network_error"));

    await mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    const flags = apiFetch.mock.calls.map(([, options]) => options.skipNetworkErrorReport);
    expect(flags).toEqual([true, true, false]);
  });
});
