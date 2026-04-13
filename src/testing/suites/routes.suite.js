/**
 * In-browser suite for critical user flows.
 * Focuses on login, onboarding, and play-saving paths instead of import-only checks.
 */
import { createElement, Fragment } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { buildSuite } from "../testRunner";
import {
  clickElement,
  renderRouteTree,
  submitForm,
  typeInto,
  waitFor,
} from "../renderHelper";
import { __resetErrorReporterForTests } from "../../utils/errorReporter";

import Login from "../../pages/Login";
import Onboarding from "../../pages/Onboarding";
import SaveToPlaybookModal from "../../components/SaveToPlaybookModal";

function jsonResponse(status, body) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeMethod(value) {
  return String(value || "GET").toUpperCase();
}

function installFetchMock(definitions) {
  const calls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = normalizeMethod(init.method);
    const call = {
      url,
      method,
      init,
      body: (() => {
        if (!init.body) return null;
        try {
          return JSON.parse(init.body);
        } catch {
          return init.body;
        }
      })(),
    };
    calls.push(call);

    const match = definitions.find((definition) => {
      if (normalizeMethod(definition.method) !== method) return false;
      if (typeof definition.match === "string") return url.includes(definition.match);
      if (definition.match instanceof RegExp) return definition.match.test(url);
      if (typeof definition.match === "function") return definition.match(call);
      return false;
    });

    if (!match) {
      call.error = "No mock matched this request";
      throw new Error(`Unhandled fetch mock for ${method} ${url}`);
    }

    if (match.reject) {
      call.error = match.reject?.message || String(match.reject);
      throw match.reject;
    }

    try {
      const response = typeof match.response === "function"
        ? await match.response(call)
        : match.response;
      call.status = response?.status ?? "unknown";
      return response;
    } catch (error) {
      call.error = error?.message || String(error);
      throw error;
    }
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function resetBrowserState() {
  localStorage.clear();
  sessionStorage.clear();
  __resetErrorReporterForTests();
}

function findButton(container, label) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent.replace(/\s+/g, " ").trim().includes(label)
  );
}

function createLocationProbe(pathRef) {
  return function LocationProbe() {
    const location = useLocation();
    pathRef.current = `${location.pathname}${location.search}`;
    return null;
  };
}

function withLocationProbe(tree, pathRef) {
  const LocationProbe = createLocationProbe(pathRef);
  return createElement(Fragment, null, createElement(LocationProbe), tree);
}

function truncateText(value, maxLength = 700) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "(empty)";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

function formatFetchLog(calls) {
  if (!calls?.length) return "No fetch calls recorded.";
  return calls.map((call, index) => {
    const path = call.url.replace(/^https?:\/\/[^/]+/i, "");
    const outcome = call.error
      ? `error=${call.error}`
      : `status=${call.status ?? "pending"}`;
    const body = call.body
      ? ` body=${truncateText(typeof call.body === "string" ? call.body : JSON.stringify(call.body), 220)}`
      : "";
    return `${index + 1}. ${call.method} ${path} ${outcome}${body}`;
  }).join("\n");
}

function formatMessages(messages) {
  if (!messages?.length) return "No app messages shown.";
  return messages.map((message, index) => `${index + 1}. ${message.filter(Boolean).join(" | ")}`).join("\n");
}

function formatUiSnapshot(container) {
  if (!container) return "No container available.";
  const text = truncateText(container.textContent, 500);
  const buttons = Array.from(container.querySelectorAll("button"))
    .map((button) => `${truncateText(button.textContent, 60)} [${button.disabled ? "disabled" : "enabled"}]`)
    .slice(0, 8)
    .join("; ") || "none";
  const inputs = Array.from(container.querySelectorAll("input, textarea"))
    .map((field) => {
      const name = field.getAttribute("placeholder") || field.getAttribute("type") || field.tagName.toLowerCase();
      return `${name}=${truncateText(field.value, 80)}`;
    })
    .slice(0, 8)
    .join("; ") || "none";
  return `Text: ${text}\nButtons: ${buttons}\nInputs: ${inputs}`;
}

function attachDiagnostics(error, { ref, fetchMock, messages = [], pathRef, extras = {} }) {
  const details = [
    `Current route: ${pathRef?.current || "(unknown)"}`,
    `Fetch log:\n${formatFetchLog(fetchMock?.calls || [])}`,
    `Messages:\n${formatMessages(messages)}`,
    `UI snapshot:\n${formatUiSnapshot(ref?.container)}`,
  ];

  const extraEntries = Object.entries(extras).filter(([, value]) => value !== undefined);
  if (extraEntries.length > 0) {
    details.push(extraEntries.map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n"));
  }

  return new Error(`${error?.message || String(error)}\n\n${details.join("\n\n")}`);
}

function createRealAuthUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Coach Taylor",
    email: "coach@example.com",
    emailVerified: true,
    role: "coach",
    teamId: null,
    teamName: null,
    sport: "",
    seasonYear: "2026",
    ownerId: "user-1",
    isPersonalTeam: false,
    onboarded: false,
    notifications: {},
    assistantPermissions: {},
    ...overrides,
  };
}

export default buildSuite(({ describe, it, expect }) => {
  describe("Critical Flows", () => {
    it("login submits credentials and navigates to the requested route", async () => {
      resetBrowserState();
      const messages = [];
      const pathRef = { current: null };
      const fetchMock = installFetchMock([
        { method: "GET", match: "/auth/me", response: jsonResponse(401, { error: "Unauthorized" }) },
        {
          method: "POST",
          match: "/auth/login",
          response: jsonResponse(200, {
            token: "login-token",
            user: createRealAuthUser({
              onboarded: true,
              role: "owner",
              teamId: "team-1",
              teamName: "River City RFC",
              sport: "rugby",
            }),
            allTeams: [{
              teamId: "team-1",
              teamName: "River City RFC",
              sport: "rugby",
              seasonYear: "2026",
              ownerId: "user-1",
              isPersonal: false,
              role: "owner",
            }],
          }),
        },
        {
          method: "GET",
          match: /\/teams\/team-1\/members$/,
          response: jsonResponse(200, {
            members: [{ id: "user-1", name: "Coach Taylor", role: "owner", email: "coach@example.com" }],
          }),
        },
      ]);

      let ref;
      try {
        ref = renderRouteTree(
          withLocationProbe(
            createElement(
              Routes,
              null,
              createElement(Route, { path: "/login", element: createElement(Login) }),
              createElement(Route, { path: "/app/plays", element: createElement("div", null, "plays-loaded") })
            ),
            pathRef
          ),
          {
            entry: "/login?returnTo=/app/plays",
            authMode: "real",
            messageValue: {
              showMessage: (...args) => messages.push(args),
              hideMessage: () => {},
            },
          }
        );

        typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
        typeInto(ref.container.querySelector('input[type="password"]'), "secret-pass");
        submitForm(ref.container.querySelector("form"));

        try {
          await waitFor(
            () => ref.container.textContent.includes("plays-loaded"),
            { errorMessage: "Login flow did not navigate to the plays route" }
          );

          expect(localStorage.getItem("coachable_token")).toBe("login-token");
          expect(messages).toHaveLength(0);
          expect(fetchMock.calls.some((call) => call.url.includes("/auth/login"))).toBeTruthy();
        } catch (error) {
          throw attachDiagnostics(error, {
            ref,
            fetchMock,
            messages,
            pathRef,
            extras: {
              storedToken: localStorage.getItem("coachable_token") || "(none)",
            },
          });
        }
      } finally {
        ref?.cleanup();
        fetchMock.restore();
        resetBrowserState();
      }
    }, "Runs the real login screen through AuthContext, verifies /auth/login succeeds, the JWT is stored, and the user lands on the requested destination.");

    it("login connection failures raise a user-facing error and send an API error report", async () => {
      resetBrowserState();
      const messages = [];
      const pathRef = { current: null };
      const fetchMock = installFetchMock([
        { method: "GET", match: "/auth/me", response: jsonResponse(401, { error: "Unauthorized" }) },
        {
          method: "POST",
          match: "/auth/login",
          reject: new TypeError("Failed to fetch"),
        },
        {
          method: "POST",
          match: "/error-reports",
          response: jsonResponse(201, { ok: true }),
        },
      ]);

      let ref;
      try {
        ref = renderRouteTree(
          withLocationProbe(
            createElement(
              Routes,
              null,
              createElement(Route, { path: "/login", element: createElement(Login) })
            ),
            pathRef
          ),
          {
            entry: "/login",
            authMode: "real",
            messageValue: {
              showMessage: (...args) => messages.push(args),
              hideMessage: () => {},
            },
          }
        );

        typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
        typeInto(ref.container.querySelector('input[type="password"]'), "secret-pass");
        submitForm(ref.container.querySelector("form"));

        try {
          await waitFor(
            () => messages.length > 0,
            { errorMessage: "Login failure message never surfaced to the user" }
          );
          await waitFor(
            () => fetchMock.calls.some((call) => call.url.includes("/error-reports")),
            { errorMessage: "API failure was not reported to the error reporter" }
          );

          expect(messages[0][0]).toBe("Login failed");
          expect(messages[0][1]).toContain("Could not reach the server");

          const reportCall = fetchMock.calls.find((call) => call.url.includes("/error-reports"));
          expect(reportCall.body.component).toBe("api");
          expect(reportCall.body.action).toBe("POST /auth/login");
          expect(reportCall.body.extra.kind).toBe("network");
        } catch (error) {
          throw attachDiagnostics(error, {
            ref,
            fetchMock,
            messages,
            pathRef,
            extras: {
              storedToken: localStorage.getItem("coachable_token") || "(none)",
            },
          });
        }
      } finally {
        ref?.cleanup();
        fetchMock.restore();
        resetBrowserState();
      }
    }, "Checks the exact failure path you care about: backend connection loss during login should show a usable error and create an actionable admin report tied to the route.");

    it("onboarding create-team flow posts to the backend and lands on plays", async () => {
      resetBrowserState();
      const pathRef = { current: null };
      const fetchMock = installFetchMock([
        {
          method: "GET",
          match: "/auth/me",
          response: jsonResponse(200, {
            user: createRealAuthUser(),
            allTeams: [],
          }),
        },
        {
          method: "POST",
          match: "/onboarding/create-team",
          response: jsonResponse(200, {
            team: {
              id: "team-new",
              name: "River City RFC",
              sport: "rugby",
              ownerId: "user-1",
            },
          }),
        },
        {
          method: "GET",
          match: /\/teams\/team-new\/members$/,
          response: jsonResponse(200, {
            members: [{ id: "user-1", name: "Coach Taylor", role: "coach", email: "coach@example.com" }],
          }),
        },
      ]);

      let ref;
      try {
        ref = renderRouteTree(
          withLocationProbe(
            createElement(
              Routes,
              null,
              createElement(Route, { path: "/onboarding", element: createElement(Onboarding) }),
              createElement(Route, { path: "/app/plays", element: createElement("div", null, "plays-loaded") })
            ),
            pathRef
          ),
          {
            entry: "/onboarding",
            authMode: "real",
          }
        );

        typeInto(ref.container.querySelector('input[placeholder="e.g. Riverside Rugby"]'), "River City RFC");
        clickElement(findButton(ref.container, "Finish setup"));

        try {
          await waitFor(
            () => ref.container.textContent.includes("plays-loaded"),
            { errorMessage: "Onboarding create-team flow did not navigate to plays" }
          );

          const createTeamCall = fetchMock.calls.find((call) => call.url.includes("/onboarding/create-team"));
          expect(createTeamCall.body.teamName).toBe("River City RFC");
        } catch (error) {
          throw attachDiagnostics(error, {
            ref,
            fetchMock,
            pathRef,
          });
        }
      } finally {
        ref?.cleanup();
        fetchMock.restore();
        resetBrowserState();
      }
    }, "Exercises the actual onboarding create-team route so regressions in payload shape, auth state updates, or post-setup navigation show up immediately.");

    it("save-to-playbook creates a play and returns the saved record", async () => {
      resetBrowserState();
      const pathRef = { current: null };
      let savedPlay = null;
      let closed = false;

      const fetchMock = installFetchMock([
        {
          method: "GET",
          match: /\/teams\/team-1\/folders$/,
          response: jsonResponse(200, { folders: [] }),
        },
        {
          method: "POST",
          match: /\/teams\/team-1\/plays$/,
          response: jsonResponse(201, {
            play: {
              id: "play-1",
              teamId: "team-1",
              title: "Counter Sweep",
              tags: [],
              playData: { frames: [] },
              notes: "",
              notesAuthorName: "",
              favorited: false,
              hiddenFromPlayers: false,
              createdAt: "2026-04-12T10:00:00.000Z",
              updatedAt: "2026-04-12T10:00:00.000Z",
            },
          }),
        },
      ]);

      let ref;
      try {
        ref = renderRouteTree(
          withLocationProbe(
            createElement(SaveToPlaybookModal, {
              open: true,
              playName: "Counter Sweep",
              playData: { frames: [] },
              onClose: () => { closed = true; },
              onSaved: (play) => { savedPlay = play; },
            }),
            pathRef
          )
        );

        try {
          await waitFor(
            () => {
              const button = findButton(ref.container, "Save Play");
              return button && !button.disabled ? button : null;
            },
            { errorMessage: "Save Play button never became ready" }
          );
          clickElement(findButton(ref.container, "Save Play"));

          await waitFor(
            () => savedPlay?.id === "play-1",
            { errorMessage: "Save to playbook did not return a saved play" }
          );

          const createPlayCall = fetchMock.calls.find((call) => /\/teams\/team-1\/plays$/.test(call.url));
          expect(createPlayCall.body.title).toBe("Counter Sweep");
          expect(savedPlay.title).toBe("Counter Sweep");
          expect(closed).toBeTruthy();
        } catch (error) {
          throw attachDiagnostics(error, {
            ref,
            fetchMock,
            pathRef,
            extras: {
              savedPlay,
              closed,
            },
          });
        }
      } finally {
        ref?.cleanup();
        fetchMock.restore();
        resetBrowserState();
      }
    }, "Covers the save flow that actually matters to coaches: loading folders, creating a play, and closing the modal with the saved record.");
  });
});
