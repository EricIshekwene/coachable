/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, setToken, clearToken, getToken } from "../utils/api";

const AuthContext = createContext(null);

const DEFAULT_NOTIFICATION_PREFERENCES = {
  playersJoinTeam: true,
  coachesMakeChanges: true,
  inviteAccepted: true,
};

const DEFAULT_ASSISTANT_PERMISSIONS = {
  canCreateEditDeletePlays: true,
  canManageRoster: true,
  canSendInvites: false,
};

/**
 * Map a backend /auth/me or /auth/login response into the flat user shape
 * the rest of the frontend expects.
 */
function mapApiUserToLocal(u) {
  if (!u) return null;
  const notifs = u.notifications || {};
  const assistPerms = u.assistantPermissions || {};

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified || false,
    role: u.role || null,
    teamId: u.teamId || null,
    teamName: u.teamName || null,
    sport: u.sport || "",
    seasonYear: u.seasonYear || String(new Date().getFullYear()),
    teamLogo: u.teamLogo || "",
    ownerId: u.ownerId || null,
    onboarded: u.onboarded || false,
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...notifs,
    },
    assistantPermissions: {
      ...DEFAULT_ASSISTANT_PERMISSIONS,
      ...assistPerms,
    },
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingEmailChange, setPendingEmailChange] = useState(null);
  const [playerViewMode, setPlayerViewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session from stored JWT
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch("/auth/me")
      .then((data) => {
        setUser(mapApiUserToLocal(data.user));
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  // When user changes and has a team, fetch team members
  useEffect(() => {
    if (!user?.teamId) {
      setTeamMembers([]);
      return;
    }
    apiFetch(`/teams/${user.teamId}/members`)
      .then((data) => {
        setTeamMembers(
          (data.members || []).map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            email: m.email,
          }))
        );
      })
      .catch(() => setTeamMembers([]));
  }, [user?.teamId]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch("/auth/me");
      setUser(mapApiUserToLocal(data.user));
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    const localUser = mapApiUserToLocal(data.user);
    setUser(localUser);
    return localUser;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: { name, email, password },
    });
    setToken(data.token);
    const localUser = mapApiUserToLocal(data.user);
    setUser(localUser);
    return { user: localUser, requiresVerification: data.requiresVerification || false };
  }, []);

  const completeOnboarding = useCallback(
    async ({ teamName, teamAction, inviteCode, role, sport }) => {
      if (teamAction === "create") {
        const data = await apiFetch("/onboarding/create-team", {
          method: "POST",
          body: { teamName, sport, role: "coach" },
        });
        const team = data.team || {};
        setUser((prev) => ({
          ...prev,
          role: "coach",
          teamId: team.id,
          teamName: team.name,
          sport: team.sport || "",
          ownerId: prev.id,
          onboarded: true,
        }));
      } else {
        const data = await apiFetch("/onboarding/join-team", {
          method: "POST",
          body: { inviteCode, role: role || "player" },
        });
        const team = data.team || {};
        setUser((prev) => ({
          ...prev,
          role: role || "player",
          teamId: team.id,
          teamName: team.name,
          sport: team.sport || "",
          ownerId: team.ownerId || null,
          onboarded: true,
        }));
      }
    },
    []
  );

  const updateProfile = useCallback(async ({ name }) => {
    if (!name?.trim()) return false;
    const trimmedName = name.trim();
    await apiFetch("/users/me", {
      method: "PATCH",
      body: { name: trimmedName },
    });
    setUser((prev) => ({ ...prev, name: trimmedName }));
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === user?.id ? { ...m, name: trimmedName } : m))
    );
    return true;
  }, [user?.id]);

  const requestEmailChange = useCallback(
    (newEmail) => {
      if (!newEmail?.trim()) return false;
      const trimmedEmail = newEmail.trim().toLowerCase();
      if (trimmedEmail === user?.email) return false;
      // Email change requires Resend setup — stub for now
      setPendingEmailChange({
        currentEmail: user?.email || "",
        nextEmail: trimmedEmail,
        requestedAt: Date.now(),
      });
      return true;
    },
    [user?.email]
  );

  const confirmEmailChange = useCallback(() => {
    if (!pendingEmailChange?.nextEmail) return false;
    const nextEmail = pendingEmailChange.nextEmail;
    setUser((prev) => ({ ...prev, email: nextEmail }));
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === user?.id ? { ...m, email: nextEmail } : m))
    );
    setPendingEmailChange(null);
    return true;
  }, [pendingEmailChange, user?.id]);

  const cancelEmailChange = useCallback(() => setPendingEmailChange(null), []);

  const updateNotificationPreferences = useCallback(
    async (preferences) => {
      if (!user?.teamId) return;
      const body = {};
      if (preferences.playersJoinTeam !== undefined) body.notifyPlayersJoin = preferences.playersJoinTeam;
      if (preferences.coachesMakeChanges !== undefined) body.notifyCoachesChange = preferences.coachesMakeChanges;
      if (preferences.inviteAccepted !== undefined) body.notifyInviteAccepted = preferences.inviteAccepted;
      await apiFetch("/users/me/preferences", { method: "PATCH", body }).catch(() => {});
      setUser((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, ...preferences },
      }));
    },
    [user?.teamId]
  );

  const updateAssistantPermissions = useCallback(
    async (permissions) => {
      if (!user?.teamId) return;
      await apiFetch(`/teams/${user.teamId}/settings`, {
        method: "PATCH",
        body: { assistantPermissions: permissions },
      }).catch(() => {});
      setUser((prev) => ({
        ...prev,
        assistantPermissions: { ...prev.assistantPermissions, ...permissions },
      }));
    },
    [user?.teamId]
  );

  const updateTeamDefaults = useCallback(
    async ({ teamName, sport, teamLogo, seasonYear }) => {
      if (!user?.teamId) return;
      const body = {};
      if (teamName?.trim()) body.name = teamName.trim();
      if (sport?.trim()) body.sport = sport.trim().toLowerCase();
      if (teamLogo !== undefined) body.logo = teamLogo?.trim() || "";
      if (seasonYear?.trim()) body.seasonYear = seasonYear.trim();
      await apiFetch(`/teams/${user.teamId}/settings`, {
        method: "PATCH",
        body,
      }).catch(() => {});
      setUser((prev) => ({
        ...prev,
        teamName: body.name || prev.teamName,
        sport: body.sport || prev.sport,
        teamLogo: body.logo !== undefined ? body.logo : prev.teamLogo,
        seasonYear: body.seasonYear || prev.seasonYear,
      }));
    },
    [user?.teamId]
  );

  const transferOwnership = useCallback(
    async (newOwnerId) => {
      if (!newOwnerId || newOwnerId === user?.id || !user?.teamId) return false;
      await apiFetch(`/teams/${user.teamId}/ownership-transfer`, {
        method: "POST",
        body: { newOwnerId },
      });
      setUser((prev) => ({ ...prev, ownerId: newOwnerId }));
      return true;
    },
    [user?.id, user?.teamId]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setTeamMembers([]);
    setPendingEmailChange(null);
    setPlayerViewMode(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        teamMembers,
        pendingEmailChange,
        playerViewMode,
        setPlayerViewMode,
        login,
        signup,
        refreshUser,
        completeOnboarding,
        updateProfile,
        requestEmailChange,
        confirmEmailChange,
        cancelEmailChange,
        updateNotificationPreferences,
        updateAssistantPermissions,
        updateTeamDefaults,
        transferOwnership,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
