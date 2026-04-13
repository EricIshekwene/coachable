import { createElement, Fragment } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { buildSuite } from "../testRunner";
import { clickElement, renderRouteTree, submitForm, typeInto, waitFor } from "../renderHelper";
import { __resetErrorReporterForTests } from "../../utils/errorReporter";
import {
  AppRoutes,
  LandingGate,
  RequireAdminSession,
  RequireAuth,
  RequireNotOnboarded,
  RequireOnboarded,
} from "../../App";

import Login from "../../pages/Login";
import Signup from "../../pages/Signup";
import Onboarding from "../../pages/Onboarding";
import ForgotPassword from "../../pages/ForgotPassword";
import ResetPassword from "../../pages/ResetPassword";
import VerifyEmail from "../../pages/VerifyEmail";
import NoTeam from "../../pages/NoTeam";
import SportPickerPage from "../../pages/SportPickerPage";
import PlatformPlayView from "../../pages/PlatformPlayView";
import SharedPlay from "../../pages/SharedPlay";
import SharedFolder from "../../pages/SharedFolder";
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
      const response = typeof match.response === "function" ? await match.response(call) : match.response;
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

function route(path, element) {
  return createElement(Route, { path, element });
}

function routeTree(...routes) {
  return createElement(Routes, null, ...routes);
}

function textRoute(path, text) {
  return route(path, createElement("div", null, text));
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
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function formatFetchLog(calls) {
  if (!calls?.length) return "No fetch calls recorded.";
  return calls.map((call, index) => {
    const path = call.url.replace(/^https?:\/\/[^/]+/i, "");
    const outcome = call.error ? `error=${call.error}` : `status=${call.status ?? "pending"}`;
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
    .slice(0, 10)
    .join("; ") || "none";
  const inputs = Array.from(container.querySelectorAll("input, textarea"))
    .map((field) => {
      const name = field.getAttribute("placeholder") || field.getAttribute("type") || field.tagName.toLowerCase();
      return `${name}=${truncateText(field.value, 80)}`;
    })
    .slice(0, 10)
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
  const mergedExtras = {
    storedToken: localStorage.getItem("coachable_token") || "(none)",
    adminSession: sessionStorage.getItem("coachable_admin_session") || "(none)",
    ...extras,
  };
  const extraEntries = Object.entries(mergedExtras).filter(([, value]) => value !== undefined);
  if (extraEntries.length > 0) {
    details.push(extraEntries.map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n"));
  }
  return new Error(`${error?.message || String(error)}\n\n${details.join("\n\n")}`);
}

function createPreviewPlayData(overrides = {}) {
  return {
    players: [],
    drawings: [],
    animation: { durationMs: 1500, tracks: [] },
    pitch: { fieldType: "Rugby", pitchColor: "#4FA85D" },
    ...overrides,
  };
}

function createRealAuthUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Coach Taylor",
    email: "coach@example.com",
    emailVerified: true,
    role: "coach",
    teamId: "team-1",
    teamName: "River City RFC",
    sport: "rugby",
    seasonYear: "2026",
    ownerId: "user-1",
    isPersonalTeam: false,
    isBetaTester: false,
    onboarded: true,
    notifications: {},
    assistantPermissions: {},
    ...overrides,
  };
}

function createAllTeamsFromUser(user) {
  if (!user?.teamId) return [];
  return [{
    teamId: user.teamId,
    teamName: user.teamName || "River City RFC",
    sport: user.sport || "",
    seasonYear: user.seasonYear || "2026",
    ownerId: user.ownerId || user.id,
    isPersonal: Boolean(user.isPersonalTeam),
    role: user.role || "coach",
  }];
}

function createMockAuthValue(overrides = {}) {
  const hasUserOverride = Object.prototype.hasOwnProperty.call(overrides, "user");
  const user = hasUserOverride ? overrides.user : createRealAuthUser();
  const allTeams = Object.prototype.hasOwnProperty.call(overrides, "allTeams")
    ? overrides.allTeams
    : createAllTeamsFromUser(user);
  const teamMembers = Object.prototype.hasOwnProperty.call(overrides, "teamMembers")
    ? overrides.teamMembers
    : (user?.teamId ? [{ id: user.id, name: user.name, role: user.role, email: user.email }] : []);

  return {
    user,
    allTeams,
    loading: false,
    teamMembers,
    pendingEmailChange: null,
    playerViewMode: false,
    setPlayerViewMode: () => {},
    login: async () => user,
    signup: async () => ({ user, requiresVerification: false }),
    refreshUser: async () => {},
    completeOnboarding: async () => {},
    switchTeam: async () => {},
    joinTeam: async () => {},
    createTeam: async () => {},
    createPersonalWorkspace: async () => {},
    leaveTeam: async () => ({}),
    updateProfile: async () => true,
    requestEmailChange: async () => true,
    confirmEmailChange: async () => true,
    cancelEmailChange: () => {},
    updateNotificationPreferences: async () => {},
    updateAssistantPermissions: async () => {},
    updateTeamDefaults: async () => {},
    removeMember: async () => true,
    transferOwnership: async () => true,
    logout: () => {},
    ...overrides,
    user,
    allTeams,
    teamMembers,
  };
}

function createMessageCapture() {
  const messages = [];
  return {
    messages,
    messageValue: {
      showMessage: (...args) => messages.push(args),
      hideMessage: () => {},
    },
  };
}

function fillCodeInputs(container, code) {
  const inputs = Array.from(container.querySelectorAll('input[inputmode="numeric"]'));
  if (inputs.length < code.length) throw new Error(`Expected ${code.length} code inputs, found ${inputs.length}`);
  code.split("").forEach((digit, index) => typeInto(inputs[index], digit));
  return inputs;
}

function createLandingFetchDefinitions(sectionKey = "landing.visualize") {
  return [
    { method: "GET", match: /\/platform-plays$/, response: jsonResponse(200, { plays: [] }) },
    { method: "GET", match: `/page-sections/${sectionKey}`, response: jsonResponse(200, { section: { play: null } }) },
  ];
}

function createAppDataFetchDefinitions(teamId = "team-1") {
  return [
    { method: "GET", match: `/teams/${teamId}/plays`, response: jsonResponse(200, { plays: [] }) },
    { method: "GET", match: `/teams/${teamId}/folders`, response: jsonResponse(200, { folders: [] }) },
  ];
}

function createSharedPlayRecord(overrides = {}) {
  return {
    id: "shared-play-1",
    teamName: "River City RFC",
    title: "Counter Sweep",
    tags: ["attack"],
    playData: createPreviewPlayData(),
    notes: "",
    notesAuthorName: "Coach Taylor",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-02T10:00:00.000Z",
    ...overrides,
  };
}

function createSharedFolderRecord(overrides = {}) {
  return {
    id: "shared-folder-1",
    teamName: "River City RFC",
    name: "Attack Plans",
    plays: [
      createSharedPlayRecord({ id: "shared-play-1", title: "Counter Sweep" }),
      createSharedPlayRecord({ id: "shared-play-2", title: "Crash Ball" }),
    ],
    ...overrides,
  };
}

function SportRouteProbe() {
  const location = useLocation();
  return createElement("div", null, `sport-route:${location.pathname}`);
}

async function runCase({
  entry = "/",
  tree,
  authMode = "mock",
  authValue = createMockAuthValue(),
  messageValue,
  messages = [],
  fetchDefinitions = [],
  beforeRender,
  verify,
  getExtras,
}) {
  resetBrowserState();
  beforeRender?.();
  const pathRef = { current: null };
  const fetchMock = installFetchMock(fetchDefinitions);

  let ref;
  try {
    ref = renderRouteTree(withLocationProbe(tree, pathRef), { entry, authMode, authValue, messageValue });
    try {
      await verify({ ref, pathRef, fetchMock });
    } catch (error) {
      throw attachDiagnostics(error, {
        ref,
        fetchMock,
        messages,
        pathRef,
        extras: getExtras?.({ ref, pathRef, fetchMock }),
      });
    }
  } finally {
    ref?.cleanup();
    fetchMock.restore();
    resetBrowserState();
  }
}

const AUTH_PROTECTED_ROUTE_CASES = [
  { label: "plays list", pattern: "/app/plays", entry: "/app/plays" },
  { label: "team page", pattern: "/app/team", entry: "/app/team" },
  { label: "profile page", pattern: "/app/profile", entry: "/app/profile" },
  { label: "settings page", pattern: "/app/settings", entry: "/app/settings" },
  { label: "verify-email page", pattern: "/verify-email", entry: "/verify-email" },
  { label: "no-team page", pattern: "/no-team", entry: "/no-team" },
  { label: "play edit page", pattern: "/app/plays/:playId/edit", entry: "/app/plays/play-1/edit" },
  { label: "play view page", pattern: "/app/plays/:playId/view", entry: "/app/plays/play-1/view" },
];

const ONBOARDED_ROUTE_CASES = [
  { label: "plays list", pattern: "/app/plays", entry: "/app/plays" },
  { label: "team page", pattern: "/app/team", entry: "/app/team" },
  { label: "profile page", pattern: "/app/profile", entry: "/app/profile" },
  { label: "settings page", pattern: "/app/settings", entry: "/app/settings" },
  { label: "play edit page", pattern: "/app/plays/:playId/edit", entry: "/app/plays/play-1/edit" },
  { label: "play view page", pattern: "/app/plays/:playId/view", entry: "/app/plays/play-1/view" },
];

const TEAMLESS_ROUTE_CASES = [
  { label: "plays list", pattern: "/app/plays", entry: "/app/plays" },
  { label: "team page", pattern: "/app/team", entry: "/app/team" },
  { label: "settings page", pattern: "/app/settings", entry: "/app/settings" },
  { label: "play edit page", pattern: "/app/plays/:playId/edit", entry: "/app/plays/play-1/edit" },
];

const ADMIN_ROUTE_CASES = [
  { label: "admin tests", pattern: "/admin/tests", entry: "/admin/tests" },
  { label: "admin errors", pattern: "/admin/errors", entry: "/admin/errors" },
  { label: "admin app", pattern: "/admin/app", entry: "/admin/app" },
  { label: "admin slate", pattern: "/admin/slate", entry: "/admin/slate" },
  { label: "reported issues", pattern: "/admin/user-issues", entry: "/admin/user-issues" },
  { label: "admin play edit", pattern: "/admin/plays/:playId/edit", entry: "/admin/plays/play-1/edit" },
];

export default buildSuite(({ describe, it, expect }) => {
  describe("Route Guards", () => {
    it("landing gate shows the marketing landing page to anonymous visitors", async () => {
      await runCase({
        entry: "/",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: createLandingFetchDefinitions(),
        tree: routeTree(
          route("/", createElement(LandingGate)),
          textRoute("/app", "app-home"),
          textRoute("/onboarding", "onboarding-home"),
        ),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Design plays."), {
            errorMessage: "Anonymous visitor never saw the landing page",
          });
          expect(pathRef.current).toBe("/");
        },
      });
    }, "Verifies the root landing gate leaves anonymous visitors on the public marketing homepage instead of bouncing them into the app.");

    it("landing gate redirects onboarded users into the app shell", async () => {
      await runCase({
        entry: "/",
        tree: routeTree(
          route("/", createElement(LandingGate)),
          textRoute("/app", "app-home"),
          textRoute("/onboarding", "onboarding-home"),
        ),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("app-home"), {
            errorMessage: "Landing gate did not redirect onboarded user into the app",
          });
          expect(pathRef.current).toBe("/app");
        },
      });
    }, "Catches regressions where signed-in, onboarded users get stranded on the marketing homepage instead of landing inside the app.");

    it("landing gate redirects not-yet-onboarded users to onboarding", async () => {
      await runCase({
        entry: "/",
        authValue: createMockAuthValue({
          user: createRealAuthUser({ onboarded: false, teamId: null, teamName: null, sport: "" }),
          allTeams: [],
          teamMembers: [],
        }),
        tree: routeTree(
          route("/", createElement(LandingGate)),
          textRoute("/app", "app-home"),
          textRoute("/onboarding", "onboarding-home"),
        ),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("onboarding-home"), {
            errorMessage: "Landing gate did not redirect non-onboarded user to onboarding",
          });
          expect(pathRef.current).toBe("/onboarding");
        },
      });
    }, "Ensures returning users who have accounts but have not finished setup are sent back into the onboarding flow.");

    AUTH_PROTECTED_ROUTE_CASES.forEach(({ label, pattern, entry }) => {
      it(`anonymous visitors hitting ${label} are redirected to login with returnTo`, async () => {
        await runCase({
          entry,
          authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
          tree: routeTree(
            route(pattern, createElement(RequireAuth, null, createElement("div", null, "protected"))),
            textRoute("/login", "login-screen"),
          ),
          verify: async ({ ref, pathRef }) => {
            await waitFor(() => ref.container.textContent.includes("login-screen"), {
              errorMessage: `Anonymous user was not redirected away from ${entry}`,
            });
            expect(pathRef.current).toBe(`/login?returnTo=${encodeURIComponent(entry)}`);
          },
          getExtras: () => ({ protectedPath: entry }),
        });
      }, `Protects ${entry} so guests are sent to login and can be returned to the exact route after authenticating.`);
    });

    ONBOARDED_ROUTE_CASES.forEach(({ label, pattern, entry }) => {
      it(`signed-in users who have not finished onboarding are bounced from ${label} to onboarding`, async () => {
        await runCase({
          entry,
          authValue: createMockAuthValue({
            user: createRealAuthUser({ onboarded: false, teamId: null, teamName: null, sport: "" }),
            allTeams: [],
            teamMembers: [],
          }),
          tree: routeTree(
            route(pattern, createElement(RequireOnboarded, null, createElement("div", null, "protected"))),
            textRoute("/onboarding", "onboarding-screen"),
          ),
          verify: async ({ ref, pathRef }) => {
            await waitFor(() => ref.container.textContent.includes("onboarding-screen"), {
              errorMessage: `${entry} did not redirect incomplete user to onboarding`,
            });
            expect(pathRef.current).toBe("/onboarding");
          },
          getExtras: () => ({ protectedPath: entry }),
        });
      }, `Keeps ${entry} behind onboarding completion so partially-set-up accounts return to the setup flow instead of half-rendering app pages.`);
    });

    TEAMLESS_ROUTE_CASES.forEach(({ label, pattern, entry }) => {
      it(`onboarded users with no teams are redirected from ${label} to /no-team`, async () => {
        await runCase({
          entry,
          authValue: createMockAuthValue({
            user: createRealAuthUser({ onboarded: true, teamId: null, teamName: null, sport: "" }),
            allTeams: [],
            teamMembers: [],
          }),
          tree: routeTree(
            route(pattern, createElement(RequireOnboarded, null, createElement("div", null, "protected"))),
            textRoute("/no-team", "no-team-screen"),
          ),
          verify: async ({ ref, pathRef }) => {
            await waitFor(() => ref.container.textContent.includes("no-team-screen"), {
              errorMessage: `${entry} did not redirect teamless user to the safety-net page`,
            });
            expect(pathRef.current).toBe("/no-team");
          },
          getExtras: () => ({ protectedPath: entry }),
        });
      }, `Enforces the no-team safety net for ${entry} so onboarded users without memberships recover through the dedicated route instead of a broken app shell.`);
    });

    it("already onboarded users cannot revisit onboarding", async () => {
      await runCase({
        entry: "/onboarding",
        tree: routeTree(
          route("/onboarding", createElement(RequireNotOnboarded, null, createElement("div", null, "onboarding-screen"))),
          textRoute("/app/plays", "plays-screen"),
        ),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("plays-screen"), {
            errorMessage: "Onboarded user was not redirected away from onboarding",
          });
          expect(pathRef.current).toBe("/app/plays");
        },
      });
    }, "Prevents already-onboarded users from circling back into setup and potentially breaking the app state.");

    it("the /no-team route redirects users who already have memberships back to plays", async () => {
      await runCase({
        entry: "/no-team",
        tree: routeTree(
          route("/no-team", createElement(NoTeam)),
          textRoute("/app/plays", "plays-screen"),
        ),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("plays-screen"), {
            errorMessage: "/no-team did not bounce a user who already has teams back into the app",
          });
          expect(pathRef.current).toBe("/app/plays");
        },
      });
    }, "Matches the production safety-net contract: /no-team is only valid for users with zero memberships, otherwise it should send them back to plays.");

    ADMIN_ROUTE_CASES.forEach(({ label, pattern, entry }) => {
      it(`admin session guard redirects visitors away from ${label} when no session is present`, async () => {
        await runCase({
          entry,
          authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
          tree: routeTree(
            route(pattern, createElement(RequireAdminSession, null, createElement("div", null, "admin-protected"))),
            textRoute("/admin", "admin-login"),
          ),
          verify: async ({ ref, pathRef }) => {
            await waitFor(() => ref.container.textContent.includes("admin-login"), {
              errorMessage: `${entry} did not redirect to the admin login screen`,
            });
            expect(pathRef.current).toBe("/admin");
          },
          getExtras: () => ({ protectedPath: entry }),
        });
      }, `Checks the admin session gate on ${entry} so direct links cannot bypass the password wall.`);
    });

    ADMIN_ROUTE_CASES.forEach(({ label, pattern, entry }) => {
      it(`admin session guard allows ${label} when a valid admin session exists`, async () => {
        await runCase({
          entry,
          beforeRender: () => sessionStorage.setItem("coachable_admin_session", "ok"),
          authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
          tree: routeTree(
            route(pattern, createElement(RequireAdminSession, null, createElement("div", null, "admin-protected"))),
            textRoute("/admin", "admin-login"),
          ),
          verify: async ({ ref, pathRef }) => {
            await waitFor(() => ref.container.textContent.includes("admin-protected"), {
              errorMessage: `${entry} stayed locked even with a valid admin session`,
            });
            expect(pathRef.current).toBe(entry);
          },
          getExtras: () => ({ protectedPath: entry }),
        });
      }, `Verifies the admin session check does not over-block authenticated admins on ${entry}.`);
    });

    it("the /app index route redirects authenticated onboarded users to /app/plays", async () => {
      await runCase({
        entry: "/app",
        tree: createElement(AppRoutes),
        fetchDefinitions: createAppDataFetchDefinitions(),
        verify: async ({ pathRef, fetchMock }) => {
          await waitFor(() => pathRef.current === "/app/plays", {
            errorMessage: "/app index never redirected to /app/plays",
          });
          expect(fetchMock.calls.some((call) => call.url.includes("/teams/team-1/plays"))).toBeTruthy();
        },
      });
    }, "Covers the nested app index redirect so logged-in users land on the plays workspace instead of a blank shell route.");

    it("unknown routes fall through to the NotFound page", async () => {
      await runCase({
        entry: "/this-route-does-not-exist",
        tree: createElement(AppRoutes),
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Out of bounds."), {
            errorMessage: "Unknown route did not render the 404 page",
          });
          expect(pathRef.current).toBe("/this-route-does-not-exist");
        },
      });
    }, "Ensures the router still catches unknown URLs and renders the explicit 404 experience.");
  });

  describe("Critical Flows", () => {
    it("login submits credentials and navigates to the requested route", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/login?returnTo=/app/plays",
        authMode: "real",
        messageValue,
        messages,
        fetchDefinitions: [
          { method: "GET", match: "/auth/me", response: jsonResponse(401, { error: "Unauthorized" }) },
          {
            method: "POST",
            match: "/auth/login",
            response: jsonResponse(200, {
              token: "login-token",
              user: createRealAuthUser({ onboarded: true, role: "owner" }),
              allTeams: createAllTeamsFromUser(createRealAuthUser({ role: "owner" })),
            }),
          },
          {
            method: "GET",
            match: /\/teams\/team-1\/members$/,
            response: jsonResponse(200, {
              members: [{ id: "user-1", name: "Coach Taylor", role: "owner", email: "coach@example.com" }],
            }),
          },
        ],
        tree: routeTree(route("/login", createElement(Login)), textRoute("/app/plays", "plays-loaded")),
        verify: async ({ ref, fetchMock }) => {
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          typeInto(ref.container.querySelector('input[type="password"]'), "secret-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => ref.container.textContent.includes("plays-loaded"), {
            errorMessage: "Login flow did not navigate to the plays route",
          });
          expect(localStorage.getItem("coachable_token")).toBe("login-token");
          expect(messages).toHaveLength(0);
          expect(fetchMock.calls.some((call) => call.url.includes("/auth/login"))).toBeTruthy();
        },
      });
    }, "Runs the real login screen through AuthContext, verifies /auth/login succeeds, the JWT is stored, and the user lands on the requested destination.");

    it("login with a wrong password surfaces the backend error without navigating away", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/login",
        authMode: "real",
        messageValue,
        messages,
        fetchDefinitions: [
          { method: "GET", match: "/auth/me", response: jsonResponse(401, { error: "Unauthorized" }) },
          { method: "POST", match: "/auth/login", response: jsonResponse(401, { error: "Invalid email or password." }) },
        ],
        tree: routeTree(route("/login", createElement(Login))),
        verify: async ({ ref, pathRef, fetchMock }) => {
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          typeInto(ref.container.querySelector('input[type="password"]'), "wrong-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => messages.length > 0, {
            errorMessage: "Wrong-password login did not surface an error message",
          });
          expect(messages[0][0]).toBe("Login failed");
          expect(messages[0][1]).toContain("Invalid email or password");
          expect(pathRef.current).toBe("/login");
          expect(fetchMock.calls.filter((call) => call.url.includes("/auth/login"))).toHaveLength(1);
        },
      });
    }, "Checks the bad-credentials path so login failures stay on /login and surface the backend error instead of silently failing.");

    it("login connection failures raise a user-facing error and send an API error report", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/login",
        authMode: "real",
        messageValue,
        messages,
        fetchDefinitions: [
          { method: "GET", match: "/auth/me", response: jsonResponse(401, { error: "Unauthorized" }) },
          { method: "POST", match: "/auth/login", reject: new TypeError("Failed to fetch") },
          { method: "POST", match: "/error-reports", response: jsonResponse(201, { ok: true }) },
        ],
        tree: routeTree(route("/login", createElement(Login))),
        verify: async ({ ref, fetchMock }) => {
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          typeInto(ref.container.querySelector('input[type="password"]'), "secret-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => messages.length > 0, {
            errorMessage: "Login failure message never surfaced to the user",
          });
          await waitFor(() => fetchMock.calls.some((call) => call.url.includes("/error-reports")), {
            errorMessage: "API failure was not reported to the error reporter",
          });
          expect(messages[0][0]).toBe("Login failed");
          expect(messages[0][1]).toContain("Could not reach the server");
          const reportCall = fetchMock.calls.find((call) => call.url.includes("/error-reports"));
          expect(reportCall.body.component).toBe("api");
          expect(reportCall.body.action).toBe("POST /auth/login");
          expect(reportCall.body.extra.kind).toBe("network");
        },
      });
    }, "Checks the exact failure path you care about: backend connection loss during login should show a usable error and create an actionable admin report tied to the route.");

    it("login sends users with incomplete onboarding back to onboarding", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/login?returnTo=/app/team",
        authMode: "real",
        messageValue,
        messages,
        fetchDefinitions: [
          { method: "GET", match: "/auth/me", response: jsonResponse(401, { error: "Unauthorized" }) },
          {
            method: "POST",
            match: "/auth/login",
            response: jsonResponse(200, {
              token: "partial-token",
              user: createRealAuthUser({ onboarded: false, teamId: null, teamName: null, sport: "" }),
              allTeams: [],
            }),
          },
        ],
        tree: routeTree(route("/login", createElement(Login)), textRoute("/onboarding", "onboarding-loaded")),
        verify: async ({ ref, pathRef }) => {
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          typeInto(ref.container.querySelector('input[type="password"]'), "secret-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => ref.container.textContent.includes("onboarding-loaded"), {
            errorMessage: "Incomplete-onboarding login did not navigate back to onboarding",
          });
          expect(pathRef.current).toBe("/onboarding?returnTo=%2Fapp%2Fteam");
          expect(messages).toHaveLength(0);
        },
      });
    }, "Covers the returning-user recovery path where login succeeds but the account still needs onboarding before the app can load.");

    it("signup with valid details navigates into email verification and preserves invite context", async () => {
      const { messages, messageValue } = createMessageCapture();
      const signupCalls = [];
      await runCase({
        entry: "/signup?invite=ABC123&returnTo=/app/team",
        authValue: createMockAuthValue({
          user: null,
          allTeams: [],
          teamMembers: [],
          signup: async (...args) => {
            signupCalls.push(args);
            return {
              user: createRealAuthUser({ onboarded: false, teamId: null, teamName: null, sport: "" }),
              requiresVerification: true,
            };
          },
        }),
        messageValue,
        messages,
        tree: routeTree(
          route("/signup", createElement(Signup)),
          textRoute("/verify-email", "verify-email-loaded"),
          textRoute("/onboarding", "onboarding-loaded"),
        ),
        verify: async ({ ref, pathRef }) => {
          typeInto(ref.container.querySelector('input[placeholder="Jane Smith"]'), "Coach Taylor");
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          const passwordInputs = ref.container.querySelectorAll('input[type="password"]');
          typeInto(passwordInputs[0], "secret-pass");
          typeInto(passwordInputs[1], "secret-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => ref.container.textContent.includes("verify-email-loaded"), {
            errorMessage: "Signup did not navigate to email verification",
          });
          expect(pathRef.current).toBe("/verify-email?invite=ABC123&returnTo=%2Fapp%2Fteam");
          expect(signupCalls).toHaveLength(1);
          expect(signupCalls[0][0]).toBe("Coach Taylor");
          expect(signupCalls[0][1]).toBe("coach@example.com");
          expect(messages).toHaveLength(0);
        },
        getExtras: () => ({ signupCalls }),
      });
    }, "Runs the signup route with real form validation and verifies it preserves invite + returnTo context when email verification is required.");

    it("signup with a duplicate email keeps the user on the form and surfaces the backend message", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/signup",
        authValue: createMockAuthValue({
          user: null,
          allTeams: [],
          teamMembers: [],
          signup: async () => { throw new Error("An account with that email already exists."); },
        }),
        messageValue,
        messages,
        tree: routeTree(route("/signup", createElement(Signup))),
        verify: async ({ ref, pathRef }) => {
          typeInto(ref.container.querySelector('input[placeholder="Jane Smith"]'), "Coach Taylor");
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          const passwordInputs = ref.container.querySelectorAll('input[type="password"]');
          typeInto(passwordInputs[0], "secret-pass");
          typeInto(passwordInputs[1], "secret-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => messages.length > 0, { errorMessage: "Duplicate-email signup did not show an error" });
          expect(messages[0][0]).toBe("Signup failed");
          expect(messages[0][1]).toContain("already exists");
          expect(pathRef.current).toBe("/signup");
        },
      });
    }, "Verifies the duplicate-email signup path stays on the route and surfaces the backend error clearly.");

    it("signup rejects invalid email format before calling auth", async () => {
      const { messages, messageValue } = createMessageCapture();
      let signupCalls = 0;
      await runCase({
        entry: "/signup",
        authValue: createMockAuthValue({
          user: null,
          allTeams: [],
          teamMembers: [],
          signup: async () => {
            signupCalls += 1;
            return { user: null, requiresVerification: false };
          },
        }),
        messageValue,
        messages,
        tree: routeTree(route("/signup", createElement(Signup))),
        verify: async ({ ref, pathRef }) => {
          typeInto(ref.container.querySelector('input[placeholder="Jane Smith"]'), "Coach Taylor");
          typeInto(ref.container.querySelector('input[type="email"]'), "not-an-email");
          const passwordInputs = ref.container.querySelectorAll('input[type="password"]');
          typeInto(passwordInputs[0], "secret-pass");
          typeInto(passwordInputs[1], "secret-pass");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => messages.length > 0, { errorMessage: "Invalid-email signup did not show a validation message" });
          expect(messages[0][0]).toBe("Invalid email");
          expect(signupCalls).toBe(0);
          expect(pathRef.current).toBe("/signup");
        },
        getExtras: () => ({ signupCalls }),
      });
    }, "Keeps bad email input from ever leaving the signup page, which makes failures more actionable and cheaper to debug.");

    it("forgot-password submits the email and routes the user to reset-password", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/forgot-password",
        messageValue,
        messages,
        fetchDefinitions: [{ method: "POST", match: "/auth/forgot-password", response: jsonResponse(200, { ok: true }) }],
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        tree: routeTree(route("/forgot-password", createElement(ForgotPassword)), textRoute("/reset-password", "reset-password-loaded")),
        verify: async ({ ref, pathRef, fetchMock }) => {
          typeInto(ref.container.querySelector('input[type="email"]'), "coach@example.com");
          submitForm(ref.container.querySelector("form"));
          await waitFor(() => ref.container.textContent.includes("reset-password-loaded"), {
            errorMessage: "Forgot-password flow did not navigate to the reset route",
          });
          expect(pathRef.current).toBe("/reset-password?email=coach%40example.com");
          expect(messages[0][0]).toBe("Code sent");
          expect(fetchMock.calls.some((call) => call.url.includes("/auth/forgot-password"))).toBeTruthy();
        },
      });
    }, "Exercises the actual forgot-password route transition so reset links keep their pre-filled email context.");

    it("reset-password with an invalid code stays on the route, shows the error, and clears the entered code", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/reset-password?email=coach@example.com",
        messageValue,
        messages,
        fetchDefinitions: [{ method: "POST", match: "/auth/reset-password", response: jsonResponse(400, { error: "Invalid reset code." }) }],
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        tree: routeTree(route("/reset-password", createElement(ResetPassword))),
        verify: async ({ ref, pathRef }) => {
          fillCodeInputs(ref.container, "123456");
          const passwordInputs = ref.container.querySelectorAll('input[type="password"]');
          typeInto(passwordInputs[0], "new-secret");
          typeInto(passwordInputs[1], "new-secret");
          clickElement(findButton(ref.container, "Reset password"));
          await waitFor(() => messages.length > 0, {
            errorMessage: "Invalid reset code did not surface a user-facing error",
          });
          expect(messages[0][0]).toBe("Reset failed");
          expect(messages[0][1]).toContain("Invalid reset code");
          expect(pathRef.current).toBe("/reset-password?email=coach@example.com");
          expect(Array.from(ref.container.querySelectorAll('input[inputmode="numeric"]')).every((input) => input.value === "")).toBeTruthy();
        },
      });
    }, "Covers the invalid reset-code path so copied failures show whether the route stayed put, the error rendered, and the code UI reset properly.");

    it("reset-password with an expired code keeps the user on the form and clears the code entry", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/reset-password?email=coach@example.com",
        messageValue,
        messages,
        fetchDefinitions: [{ method: "POST", match: "/auth/reset-password", response: jsonResponse(400, { error: "Expired reset code." }) }],
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        tree: routeTree(route("/reset-password", createElement(ResetPassword))),
        verify: async ({ ref, pathRef }) => {
          fillCodeInputs(ref.container, "654321");
          const passwordInputs = ref.container.querySelectorAll('input[type="password"]');
          typeInto(passwordInputs[0], "new-secret");
          typeInto(passwordInputs[1], "new-secret");
          clickElement(findButton(ref.container, "Reset password"));
          await waitFor(() => messages.length > 0, {
            errorMessage: "Expired reset code did not surface a user-facing error",
          });
          expect(messages[0][0]).toBe("Reset failed");
          expect(messages[0][1]).toContain("Expired reset code");
          expect(pathRef.current).toBe("/reset-password?email=coach@example.com");
          expect(Array.from(ref.container.querySelectorAll('input[inputmode="numeric"]')).every((input) => input.value === "")).toBeTruthy();
        },
      });
    }, "Checks the expired reset-code branch separately so failures say whether the route, message, and cleared-code behavior all happened.");

    it("verify-email success refreshes auth state and routes the user into onboarding", async () => {
      const { messages, messageValue } = createMessageCapture();
      let refreshCalls = 0;
      await runCase({
        entry: "/verify-email?invite=ABC123",
        messageValue,
        messages,
        fetchDefinitions: [{ method: "POST", match: "/verification/verify", response: jsonResponse(200, { ok: true }) }],
        authValue: createMockAuthValue({
          user: createRealAuthUser({ emailVerified: false, onboarded: false, teamId: null, teamName: null, sport: "" }),
          allTeams: [],
          teamMembers: [],
          refreshUser: async () => { refreshCalls += 1; },
        }),
        tree: routeTree(route("/verify-email", createElement(VerifyEmail)), textRoute("/onboarding", "onboarding-loaded")),
        verify: async ({ ref, pathRef }) => {
          fillCodeInputs(ref.container, "123456");
          await waitFor(() => ref.container.textContent.includes("onboarding-loaded"), {
            errorMessage: "Verify-email success did not navigate into onboarding",
          });
          expect(pathRef.current).toBe("/onboarding?invite=ABC123");
          expect(messages[0][0]).toBe("Email verified");
          expect(refreshCalls).toBe(1);
        },
        getExtras: () => ({ refreshCalls }),
      });
    }, "Exercises the verification route end to end so successful code entry refreshes auth state and continues onboarding.");

    it("verify-email with an invalid code stays on the page, shows the error, and clears the code", async () => {
      const { messages, messageValue } = createMessageCapture();
      await runCase({
        entry: "/verify-email",
        messageValue,
        messages,
        fetchDefinitions: [{ method: "POST", match: "/verification/verify", response: jsonResponse(400, { error: "Invalid or expired code." }) }],
        authValue: createMockAuthValue({
          user: createRealAuthUser({ emailVerified: false, onboarded: false, teamId: null, teamName: null, sport: "" }),
          allTeams: [],
          teamMembers: [],
        }),
        tree: routeTree(route("/verify-email", createElement(VerifyEmail))),
        verify: async ({ ref, pathRef }) => {
          fillCodeInputs(ref.container, "654321");
          await waitFor(() => messages.length > 0, {
            errorMessage: "Verify-email failure did not surface a user-facing error",
          });
          expect(messages[0][0]).toBe("Verification failed");
          expect(messages[0][1]).toContain("Invalid or expired code");
          expect(pathRef.current).toBe("/verify-email");
          expect(Array.from(ref.container.querySelectorAll('input[inputmode="numeric"]')).every((input) => input.value === "")).toBeTruthy();
        },
      });
    }, "Checks the invalid email-verification path so copied failures show the exact route, message, and cleared-code state.");

    it("onboarding create-team flow posts to the backend and lands on plays", async () => {
      await runCase({
        entry: "/onboarding",
        authMode: "real",
        fetchDefinitions: [
          {
            method: "GET",
            match: "/auth/me",
            response: jsonResponse(200, {
              user: createRealAuthUser({ onboarded: false, teamId: null, teamName: null, sport: "" }),
              allTeams: [],
            }),
          },
          {
            method: "POST",
            match: "/onboarding/create-team",
            response: jsonResponse(200, {
              team: { id: "team-new", name: "River City RFC", sport: "rugby", ownerId: "user-1" },
            }),
          },
          {
            method: "GET",
            match: /\/teams\/team-new\/members$/,
            response: jsonResponse(200, {
              members: [{ id: "user-1", name: "Coach Taylor", role: "coach", email: "coach@example.com" }],
            }),
          },
        ],
        tree: routeTree(route("/onboarding", createElement(Onboarding)), textRoute("/app/plays", "plays-loaded")),
        verify: async ({ ref, fetchMock }) => {
          typeInto(ref.container.querySelector('input[placeholder="e.g. Riverside Rugby"]'), "River City RFC");
          clickElement(findButton(ref.container, "Finish setup"));
          await waitFor(() => ref.container.textContent.includes("plays-loaded"), {
            errorMessage: "Onboarding create-team flow did not navigate to plays",
          });
          const createTeamCall = fetchMock.calls.find((call) => call.url.includes("/onboarding/create-team"));
          expect(createTeamCall.body.teamName).toBe("River City RFC");
        },
      });
    }, "Exercises the actual onboarding create-team route so regressions in payload shape, auth state updates, or post-setup navigation show up immediately.");

    it("save-to-playbook creates a play and returns the saved record", async () => {
      let savedPlay = null;
      let closed = false;
      await runCase({
        fetchDefinitions: [
          { method: "GET", match: /\/teams\/team-1\/folders$/, response: jsonResponse(200, { folders: [] }) },
          {
            method: "POST",
            match: /\/teams\/team-1\/plays$/,
            response: jsonResponse(201, {
              play: {
                id: "play-1",
                teamId: "team-1",
                title: "Counter Sweep",
                tags: [],
                playData: createPreviewPlayData(),
                notes: "",
                notesAuthorName: "",
                favorited: false,
                hiddenFromPlayers: false,
                createdAt: "2026-04-12T10:00:00.000Z",
                updatedAt: "2026-04-12T10:00:00.000Z",
              },
            }),
          },
        ],
        tree: createElement(SaveToPlaybookModal, {
          open: true,
          playName: "Counter Sweep",
          playData: createPreviewPlayData(),
          onClose: () => { closed = true; },
          onSaved: (play) => { savedPlay = play; },
        }),
        verify: async ({ ref, fetchMock }) => {
          await waitFor(() => {
            const button = findButton(ref.container, "Save Play");
            return button && !button.disabled ? button : null;
          }, {
            errorMessage: "Save Play button never became ready",
          });
          clickElement(findButton(ref.container, "Save Play"));
          await waitFor(() => savedPlay?.id === "play-1", {
            errorMessage: "Save to playbook did not return a saved play",
          });
          const createPlayCall = fetchMock.calls.find((call) => /\/teams\/team-1\/plays$/.test(call.url));
          expect(createPlayCall.body.title).toBe("Counter Sweep");
          expect(savedPlay.title).toBe("Counter Sweep");
          expect(closed).toBeTruthy();
        },
        getExtras: () => ({ savedPlay, closed }),
      });
    }, "Covers the save flow that actually matters to coaches: loading folders, creating a play, and closing the modal with the saved record.");
  });

  describe("Public Routes", () => {
    it("sport picker routes into the sport-specific slate when a sport card is selected", async () => {
      await runCase({
        entry: "/slate",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        tree: routeTree(route("/slate", createElement(SportPickerPage)), route("/slate/:sport", createElement(SportRouteProbe))),
        verify: async ({ ref, pathRef }) => {
          clickElement(findButton(ref.container, "Rugby"));
          await waitFor(() => ref.container.textContent.includes("sport-route:/slate/rugby"), {
            errorMessage: "Sport picker did not navigate to the rugby slate route",
          });
          expect(pathRef.current).toBe("/slate/rugby");
        },
      });
    }, "Confirms the standalone /slate entry page actually routes into /slate/:sport when a sport is chosen.");

    it("platform-play deep links load the requested public play", async () => {
      await runCase({
        entry: "/platform-play/play-1",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: [
          {
            method: "GET",
            match: "/platform-plays/play-1",
            response: jsonResponse(200, {
              play: {
                id: "play-1",
                title: "Counter Sweep",
                description: "Attack the edge.",
                sport: "rugby",
                tags: ["attack"],
                playData: createPreviewPlayData(),
              },
            }),
          },
        ],
        tree: routeTree(route("/platform-play/:playId", createElement(PlatformPlayView))),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Counter Sweep"), {
            errorMessage: "Platform play route did not render the requested play",
          });
          expect(pathRef.current).toBe("/platform-play/play-1");
        },
      });
    }, "Covers the public platform-play route so valid marketing/share links render the requested play instead of a blank state.");

    it("invalid platform-play deep links show the not-found state", async () => {
      await runCase({
        entry: "/platform-play/missing-play",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: [
          { method: "GET", match: "/platform-plays/missing-play", response: jsonResponse(404, { error: "Play not found" }) },
        ],
        tree: routeTree(route("/platform-play/:playId", createElement(PlatformPlayView))),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Play not found"), {
            errorMessage: "Invalid platform-play route did not render the not-found state",
          });
          expect(pathRef.current).toBe("/platform-play/missing-play");
        },
      });
    }, "Checks the invalid platform-play branch so broken links surface the explicit not-found UI.");

    it("shared play deep links load the play for anonymous visitors", async () => {
      await runCase({
        entry: "/shared/token-123",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: [
          { method: "GET", match: "/shared/plays/token-123", response: jsonResponse(200, { play: createSharedPlayRecord({ title: "Shared Counter" }) }) },
        ],
        tree: routeTree(route("/shared/:token", createElement(SharedPlay))),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Shared Counter"), {
            errorMessage: "Shared play route did not render the play title",
          });
          expect(pathRef.current).toBe("/shared/token-123");
        },
      });
    }, "Verifies the anonymous shared-play route loads the shared play content instead of relying on logged-in app state.");

    it("invalid shared play links show the shared-play not-found state", async () => {
      await runCase({
        entry: "/shared/bad-token",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: [
          { method: "GET", match: "/shared/plays/bad-token", response: jsonResponse(404, { error: "Play not found" }) },
        ],
        tree: routeTree(route("/shared/:token", createElement(SharedPlay))),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Play not found"), {
            errorMessage: "Bad shared play token did not show the not-found UI",
          });
          expect(pathRef.current).toBe("/shared/bad-token");
        },
      });
    }, "Covers expired or revoked shared play URLs so failures clearly show the shared-link fallback UI.");

    it("shared folder deep links load the shared folder and its plays", async () => {
      await runCase({
        entry: "/shared/folder/folder-token",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: [
          { method: "GET", match: "/shared/folders/folder-token", response: jsonResponse(200, { folder: createSharedFolderRecord() }) },
        ],
        tree: routeTree(route("/shared/folder/:token", createElement(SharedFolder))),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Attack Plans"), {
            errorMessage: "Shared folder route did not render the folder name",
          });
          expect(ref.container.textContent).toContain("2 plays");
          expect(pathRef.current).toBe("/shared/folder/folder-token");
        },
      });
    }, "Verifies the shared-folder route loads its folder metadata and play list for public visitors.");

    it("invalid shared folder links show the shared-folder not-found state", async () => {
      await runCase({
        entry: "/shared/folder/missing-folder",
        authValue: createMockAuthValue({ user: null, allTeams: [], teamMembers: [] }),
        fetchDefinitions: [
          { method: "GET", match: "/shared/folders/missing-folder", response: jsonResponse(404, { error: "Folder not found" }) },
        ],
        tree: routeTree(route("/shared/folder/:token", createElement(SharedFolder))),
        verify: async ({ ref, pathRef }) => {
          await waitFor(() => ref.container.textContent.includes("Folder not found"), {
            errorMessage: "Bad shared folder token did not show the not-found UI",
          });
          expect(pathRef.current).toBe("/shared/folder/missing-folder");
        },
      });
    }, "Covers revoked or invalid shared folder URLs so the failure mode is explicit instead of silently blank.");

    it("session restore after refresh keeps the user on /app/plays and rehydrates auth from /auth/me", async () => {
      await runCase({
        entry: "/app/plays",
        authMode: "real",
        beforeRender: () => localStorage.setItem("coachable_token", "persisted-token"),
        fetchDefinitions: [
          {
            method: "GET",
            match: "/auth/me",
            response: jsonResponse(200, {
              user: createRealAuthUser({ role: "owner" }),
              allTeams: createAllTeamsFromUser(createRealAuthUser({ role: "owner" })),
            }),
          },
          {
            method: "GET",
            match: /\/teams\/team-1\/members$/,
            response: jsonResponse(200, {
              members: [{ id: "user-1", name: "Coach Taylor", role: "owner", email: "coach@example.com" }],
            }),
          },
          ...createAppDataFetchDefinitions("team-1"),
        ],
        tree: createElement(AppRoutes),
        verify: async ({ pathRef, fetchMock }) => {
          await waitFor(() => pathRef.current === "/app/plays" && fetchMock.calls.some((call) => call.url.includes("/teams/team-1/plays")), {
            errorMessage: "App route did not restore the session and remain on /app/plays after refresh",
          });
          const authMeCall = fetchMock.calls.find((call) => call.url.includes("/auth/me"));
          expect(authMeCall.init.headers.Authorization).toBe("Bearer persisted-token");
        },
      });
    }, "Checks the post-refresh route path by using the real AuthProvider and confirming /auth/me rehydrates the session with the stored token.");

    it("logging out from the app clears the token and routes the user back to the landing page", async () => {
      await runCase({
        entry: "/app/plays",
        authMode: "real",
        beforeRender: () => localStorage.setItem("coachable_token", "login-token"),
        fetchDefinitions: [
          {
            method: "GET",
            match: "/auth/me",
            response: jsonResponse(200, {
              user: createRealAuthUser({ role: "owner" }),
              allTeams: createAllTeamsFromUser(createRealAuthUser({ role: "owner" })),
            }),
          },
          {
            method: "GET",
            match: /\/teams\/team-1\/members$/,
            response: jsonResponse(200, {
              members: [{ id: "user-1", name: "Coach Taylor", role: "owner", email: "coach@example.com" }],
            }),
          },
          ...createAppDataFetchDefinitions("team-1"),
          { method: "POST", match: "/auth/logout", response: new Response(null, { status: 204 }) },
          ...createLandingFetchDefinitions(),
        ],
        tree: createElement(AppRoutes),
        verify: async ({ ref, pathRef, fetchMock }) => {
          await waitFor(() => findButton(ref.container, "Log out"), {
            errorMessage: "App shell never rendered the logout control",
          });
          clickElement(findButton(ref.container, "Log out"));
          await waitFor(() => pathRef.current === "/" && ref.container.textContent.includes("Design plays."), {
            errorMessage: "Logout did not route back to the landing page",
          });
          expect(localStorage.getItem("coachable_token")).toBeNull();
          expect(fetchMock.calls.some((call) => call.url.includes("/auth/logout"))).toBeTruthy();
        },
      });
    }, "Exercises the logout route transition end to end so session cleanup and navigation back to landing stay wired together.");
  });
});
