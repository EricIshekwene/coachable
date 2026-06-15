import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  __resetErrorReporterForTests,
  reportApiError,
  reportError,
  setErrorReporterUserId,
} from "../../src/utils/errorReporter.js";

describe("reportError", () => {
  let fetchSpy;

  beforeEach(() => {
    __resetErrorReporterForTests();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("sends a POST request with error details", () => {
    reportError({
      errorMessage: "Test error",
      component: "testSuite",
      action: "runTest",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("/error-reports");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.errorMessage).toBe("Test error");
    expect(body.component).toBe("testSuite");
    expect(body.action).toBe("runTest");
    expect(body.deviceInfo).toBeDefined();
    expect(body.pageUrl).toBeDefined();
  });

  it("includes user ID when set", () => {
    setErrorReporterUserId("user-123");
    reportError({ errorMessage: "Test error" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.userId).toBe("user-123");
  });

  it("sends null userId when cleared", () => {
    setErrorReporterUserId(null);
    reportError({ errorMessage: "Test error" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.userId).toBeNull();
  });

  it("includes extra data when provided", () => {
    reportError({
      errorMessage: "Codec failed",
      extra: { codec: "avc1.4D0028", width: 2100 },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.extra.codec).toBe("avc1.4D0028");
    expect(body.extra.width).toBe(2100);
  });

  it("does not throw when fetch fails", () => {
    fetchSpy.mockImplementationOnce(() => Promise.reject(new Error("Network error")));
    expect(() => {
      reportError({ errorMessage: "Test" });
    }).not.toThrow();
  });

  it("includes stack trace when provided", () => {
    reportError({
      errorMessage: "Error",
      errorStack: "Error: something\n  at foo.js:1:1",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.errorStack).toContain("foo.js");
  });

  it("includes sessionId in every report", () => {
    reportError({ errorMessage: "Test" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.sessionId).toBeTruthy();
    expect(typeof body.sessionId).toBe("string");
  });

  it("reports API failures with normalized route actions", () => {
    reportApiError({
      path: "/teams/123/plays/456",
      method: "PATCH",
      status: 503,
      errorMessage: "Upstream timeout",
      extra: { kind: "server" },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.component).toBe("api");
    expect(body.action).toBe("PATCH /teams/:id/plays/:id");
    expect(body.extra.status).toBe(503);
    expect(body.extra.kind).toBe("server");
  });
});
