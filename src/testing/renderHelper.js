/**
 * Helper to render React components with mock providers for testing.
 * Mounts into a temporary DOM node, then cleans up after.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import AuthContext from "../context/AuthContext";
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

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const routeElement = asLayout
    ? createElement(Component, props, createElement(Outlet))
    : createElement(Component, props);

  const tree = createElement(
    AuthContext.Provider,
    { value: MOCK_AUTH },
    createElement(
      AppMessageProvider,
      { value: MOCK_MESSAGES },
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

  flushSync(() => root.render(tree));

  return {
    container,
    cleanup() {
      root.unmount();
      container.remove();
    },
  };
}
