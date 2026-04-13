/**
 * Helper to render React components with mock providers for testing.
 * Mounts into a temporary DOM node, then cleans up after.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { AuthProvider } from "../context/AuthContext";
import { AppMessageProvider } from "../context/AppMessageContext";

/** Mock user matching the shape from AuthContext */
const MOCK_USER = {
  id: "test-user-1",
  name: "Test User",
  email: "test@coachable.app",
  emailVerified: true,
  role: "coach",
  teamId: "team-1",
  teamName: "Test Team",
  sport: "rugby",
  seasonYear: "2026",
  ownerId: "test-user-1",
  isPersonalTeam: false,
  onboarded: true,
  notifications: {
    playersJoinTeam: true,
    coachesMakeChanges: true,
    inviteAccepted: true,
    newPlays: true,
    playUpdates: true,
    teamAnnouncements: true,
  },
  assistantPermissions: {
    canCreateEditDeletePlays: true,
    canManageRoster: true,
    canSendInvites: false,
  },
};

/** Mock auth context — all functions are no-ops */
const MOCK_AUTH = {
  user: MOCK_USER,
  loading: false,
  teamMembers: [{ id: "test-user-1", name: "Test User", role: "coach", email: "test@coachable.app" }],
  pendingEmailChange: null,
  playerViewMode: false,
  setPlayerViewMode: () => {},
  login: async () => MOCK_USER,
  signup: async () => ({ user: MOCK_USER, requiresVerification: false }),
  refreshUser: async () => {},
  completeOnboarding: async () => {},
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
};

const MOCK_MESSAGES = { showMessage: () => {}, hideMessage: () => {} };

function renderIntoContainer(tree) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  flushSync(() => root.render(tree));

  return {
    container,
    cleanup() {
      root.unmount();
      container.remove();
    },
  };
}

function wrapProviders(children, { authMode = "mock", authValue = MOCK_AUTH, messageValue = MOCK_MESSAGES } = {}) {
  const routerWrapped = createElement(
    AppMessageProvider,
    { value: messageValue },
    children
  );

  if (authMode === "real") {
    return createElement(AuthProvider, null, routerWrapped);
  }

  return createElement(AuthContext.Provider, { value: authValue }, routerWrapped);
}

/**
 * Renders a component wrapped in AuthContext + AppMessageContext + MemoryRouter.
 * Returns a cleanup function that unmounts and removes the DOM node.
 *
 * @param {Function} Component
 * @param {Object} [opts]
 * @param {string} [opts.path] - Route path pattern (e.g. "/app/plays/:playId")
 * @param {string} [opts.entry] - Initial URL (e.g. "/app/plays/test-123")
 * @param {Object} [opts.props] - Props for the component
 * @param {boolean} [opts.asLayout] - If true, renders as a layout route with empty Outlet
 */
export function renderWithProviders(Component, opts = {}) {
  const {
    path = "/test",
    entry = "/test",
    props = {},
    asLayout = false,
  } = opts;

  const routeElement = asLayout
    ? createElement(Component, props, createElement(Outlet))
    : createElement(Component, props);

  return renderIntoContainer(
    wrapProviders(
      createElement(
        MemoryRouter,
        { initialEntries: [entry] },
        createElement(
          Routes,
          null,
          asLayout
            ? createElement(
                Route,
                { path, element: routeElement },
                createElement(Route, { index: true, element: createElement("div", null, "outlet") })
              )
            : createElement(Route, { path, element: routeElement })
        )
      )
    )
  );
}

/**
 * Render an arbitrary route tree with mock or real providers.
 */
export function renderRouteTree(tree, opts = {}) {
  const { entry = "/", authMode = "mock", authValue = MOCK_AUTH, messageValue = MOCK_MESSAGES } = opts;
  return renderIntoContainer(
    wrapProviders(
      createElement(MemoryRouter, { initialEntries: [entry] }, tree),
      { authMode, authValue, messageValue }
    )
  );
}

/**
 * Wait until a predicate becomes truthy.
 */
export function waitFor(predicate, { timeoutMs = 3000, intervalMs = 16, errorMessage = "Timed out waiting for condition" } = {}) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        const result = predicate();
        if (result) {
          resolve(result);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(errorMessage));
        return;
      }

      window.setTimeout(check, intervalMs);
    };

    check();
  });
}

function setNativeElementValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
}

export function typeInto(element, value) {
  if (!element) throw new Error("typeInto requires a valid element");
  setNativeElementValue(element, value);
  element.dispatchEvent(new InputEvent("input", { bubbles: true, data: String(value) }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function clickElement(element) {
  if (!element) throw new Error("clickElement requires a valid element");
  element.click();
}

export function submitForm(form) {
  if (!form) throw new Error("submitForm requires a valid form element");
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
    return;
  }
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
}
