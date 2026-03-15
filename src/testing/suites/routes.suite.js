/**
 * In-browser test suite for route components.
 * Renders each page with mock auth/router providers, verifies mount, cleans up.
 */
import { buildSuite } from "../testRunner";
import { renderWithProviders } from "../renderHelper";
import { createElement } from "react";

import Landing from "../../pages/Landing";
import Signup from "../../pages/Signup";
import Login from "../../pages/Login";
import Onboarding from "../../pages/Onboarding";
import VerifyEmail from "../../pages/VerifyEmail";
import Admin from "../../pages/Admin";
import AdminTests from "../../pages/AdminTests";
import SharedPlay from "../../pages/SharedPlay";
import SharedPlayView from "../../pages/SharedPlayView";
import SharedFolder from "../../pages/SharedFolder";
import PlayEditPage from "../../pages/PlayEditPage";
import PlayViewOnlyPage from "../../pages/PlayViewOnlyPage";
import Plays from "../../pages/app/Plays";
import PlayNew from "../../pages/app/PlayNew";
import PlayView from "../../pages/app/PlayView";
import Team from "../../pages/app/Team";
import Profile from "../../pages/app/Profile";
import ProfileEmailVerification from "../../pages/app/ProfileEmailVerification";
import Settings from "../../pages/app/Settings";
import AppLayout from "../../layouts/AppLayout";

const ROUTES = [
  { name: "Landing", component: Landing, path: "/", entry: "/",
    desc: "The landing/marketing page. It checks auth state and redirects logged-in users. If this fails to render, new visitors will see a blank page instead of the landing page." },
  { name: "Signup", component: Signup, path: "/signup", entry: "/signup",
    desc: "The signup form page. Uses useAuth for the signup function and router for redirects. Failure here means new users can't create accounts." },
  { name: "Login", component: Login, path: "/login", entry: "/login",
    desc: "The login form page. If this fails, existing users can't sign in. Check that useAuth().login is being called correctly and form state is initialized." },
  { name: "Onboarding", component: Onboarding, path: "/onboarding", entry: "/onboarding",
    desc: "The team creation/join flow shown after signup. Requires auth context for completeOnboarding. Failure blocks new users from completing setup." },
  { name: "VerifyEmail", component: VerifyEmail, path: "/verify-email", entry: "/verify-email",
    desc: "Email verification page that processes verification tokens from URL params. Makes an API call on mount. Failure means users can't verify their email addresses." },
  { name: "Admin", component: Admin, path: "/admin", entry: "/admin",
    desc: "The admin dashboard (user management). Has its own session auth separate from user auth. If this fails to render, you can't manage users or access admin features." },
  { name: "AdminTests", component: AdminTests, path: "/admin/tests", entry: "/admin/tests",
    desc: "This test runner page itself. A render failure here would be ironic but also mean the test dashboard is broken. Check for circular import issues." },
  { name: "SharedPlay", component: SharedPlay, path: "/shared/:token", entry: "/shared/test-token",
    desc: "Public shared play page (no auth required). Fetches play data via the share token. Failure means shared play links won't work for recipients." },
  { name: "SharedPlayView", component: SharedPlayView, path: "/shared/:token/view", entry: "/shared/test-token/view",
    desc: "Full-screen view of a shared play. Uses useParams to read the share token. Failure means the 'view' link from shared play page is broken." },
  { name: "SharedFolder", component: SharedFolder, path: "/shared/folder/:token", entry: "/shared/folder/test-token",
    desc: "Shared folder page showing multiple plays. Uses useParams for the folder token. Failure means shared folder links won't display plays." },
  { name: "PlayEditPage", component: PlayEditPage, path: "/app/plays/:playId/edit", entry: "/app/plays/test-123/edit",
    desc: "Full-screen play editor (the main Slate canvas). Requires auth + playId param. This is the core feature — failure here means coaches can't edit plays." },
  { name: "PlayViewOnlyPage", component: PlayViewOnlyPage, path: "/app/plays/:playId/view", entry: "/app/plays/test-123/view",
    desc: "Read-only play viewer for players/assistants. Requires auth + playId. Failure means team members can't view plays shared with them." },
  { name: "Plays", component: Plays, path: "/app/plays", entry: "/app/plays",
    desc: "The plays list page (main app view). Fetches all plays and folders from the API. Failure means coaches can't see or manage their play library." },
  { name: "PlayNew", component: PlayNew, path: "/app/plays/new", entry: "/app/plays/new",
    desc: "Create new play page/modal. Uses auth context for team info. Failure means coaches can't create new plays." },
  { name: "PlayView", component: PlayView, path: "/app/plays/:playId", entry: "/app/plays/test-123",
    desc: "Play detail/preview page within the app layout. Shows play info and action buttons. Failure means the play detail view is broken." },
  { name: "Team", component: Team, path: "/app/team", entry: "/app/team",
    desc: "Team management page (invite codes, member list). Makes API calls for invite codes. Failure means coaches can't manage their team roster." },
  { name: "Profile", component: Profile, path: "/app/profile", entry: "/app/profile",
    desc: "User profile page (name, email editing). Uses auth context for user data and update functions. Failure means users can't update their profile." },
  { name: "ProfileEmailVerification", component: ProfileEmailVerification, path: "/app/profile/verify-email", entry: "/app/profile/verify-email",
    desc: "In-app email change verification page. Reads pendingEmailChange from auth context. Failure means users can't complete email address changes." },
  { name: "Settings", component: Settings, path: "/app/settings", entry: "/app/settings",
    desc: "App settings page (notifications, team settings, theme). Uses auth for preferences. Failure means users can't change their notification or team settings." },
  { name: "AppLayout", component: AppLayout, path: "/app/*", entry: "/app/plays", asLayout: true,
    desc: "The main app shell with sidebar navigation and mobile bottom nav. All /app/* routes render inside this layout. If this fails, the entire app navigation is broken." },
];

export default buildSuite(({ describe, it, expect }) => {
  // ─── Component Validity ───────────────────────────────────────────────
  describe("Route Components — Import Check", () => {
    for (const route of ROUTES) {
      it(`${route.name} is a valid function`, () => {
        expect(typeof route.component).toBe("function");
      }, `Verifies that the ${route.name} component module exports a valid React function. If this fails, the import is broken — likely a syntax error, missing file, or circular dependency in the component or its imports.`);
    }
  });

  // ─── Render with Auth ─────────────────────────────────────────────────
  describe("Route Components — Render with Mock Auth", () => {
    for (const route of ROUTES) {
      it(`${route.name} mounts without crashing`, () => {
        let ref;
        try {
          ref = renderWithProviders(route.component, {
            path: route.path,
            entry: route.entry,
            asLayout: route.asLayout || false,
          });
          expect(ref.container).toBeTruthy();
        } finally {
          if (ref) ref.cleanup();
        }
      }, route.desc);
    }
  });

  // ─── Route Config Completeness ────────────────────────────────────────
  describe("Route Configuration", () => {
    it("all route paths are non-empty strings", () => {
      for (const route of ROUTES) {
        expect(typeof route.path).toBe("string");
        expect(route.path.length).toBeGreaterThan(0);
      }
    }, "Every route must have a non-empty path string. An empty path would cause React Router to throw or match unexpectedly, breaking navigation.");

    it("no duplicate components (each page used once)", () => {
      const components = ROUTES.map((r) => r.component);
      const unique = new Set(components);
      expect(unique.size).toBe(components.length);
    }, "Each page component should only appear once in the route map. Duplicates would mean two routes render the same component, which is usually a copy-paste error in the router config.");

    it("expected number of routes registered", () => {
      expect(ROUTES.length).toBeGreaterThanOrEqual(19);
    }, "Sanity check that all expected routes are defined. If this number drops, a route was accidentally removed from the test suite and won't be tested.");

    it("public routes include landing, login, signup", () => {
      const names = ROUTES.map((r) => r.name);
      expect(names).toContain("Landing");
      expect(names).toContain("Login");
      expect(names).toContain("Signup");
    }, "The three core public routes must exist. If any are missing, unauthenticated users can't access the app at all.");

    it("admin routes include Admin and AdminTests", () => {
      const names = ROUTES.map((r) => r.name);
      expect(names).toContain("Admin");
      expect(names).toContain("AdminTests");
    }, "Both admin pages must be registered. If AdminTests is missing, this test dashboard route is broken.");

    it("app routes include Plays, Team, Profile, Settings", () => {
      const names = ROUTES.map((r) => r.name);
      expect(names).toContain("Plays");
      expect(names).toContain("Team");
      expect(names).toContain("Profile");
      expect(names).toContain("Settings");
    }, "The four main app sections must all be present. A missing route means that section is inaccessible from the sidebar navigation.");
  });
});
