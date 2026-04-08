/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, setAuthToken } from "../utils/api";
import { setErrorReporterUserId } from "../utils/errorReporter";

const AuthContext = createContext(null);

const DEFAULT_NOTIFICATION_PREFERENCES = {
  playersJoinTeam: true,
  coachesMakeChanges: true,
  inviteAccepted: true,
  newPlays: true,
  playUpdates: true,
  teamAnnouncements: true,
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
    ownerId: u.ownerId || null,
    isPersonalTeam: u.isPersonalTeam || false,
    isBetaTester: u.isBetaTester || false,
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

/**
 * Apply an active team object from the server onto existing user state.
 * Used after switchTeam, joinTeam, createTeam, leaveTeam.
 */
function applyActiveTeam(prev, activeTeam) {
  if (!activeTeam) return prev;
  return {
    ...prev,
    teamId: activeTeam.teamId,
    teamName: activeTeam.teamName,
    role: activeTeam.role,
    sport: activeTeam.sport || "",
    seasonYear: activeTeam.seasonYear || String(new Date().getFullYear()),
    ownerId: activeTeam.ownerId || null,
    isPersonalTeam: activeTeam.isPersonal || false,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingEmailChange, setPendingEmailChange] = useState(null);
  const [playerViewMode, setPlayerViewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from cookie
  useEffect(() => {
    apiFetch("/auth/me")
      .then((data) => {
        setUser(mapApiUserToLocal(data.user));
        setAllTeams(data.allTeams || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sync user ID to error reporter so reports include who triggered them
  useEffect(() => {
    setErrorReporterUserId(user?.id || null);
  }, [user?.id]);

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
      setAllTeams(data.allTeams || []);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (data.token) setAuthToken(data.token);
    const localUser = mapApiUserToLocal(data.user);
    setUser(localUser);
    setAllTeams(data.allTeams || []);
    return localUser;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: { name, email, password },
    });
    if (data.token) setAuthToken(data.token);
    const localUser = mapApiUserToLocal(data.user);
    setUser(localUser);
    return { user: localUser, requiresVerification: data.requiresVerification || false };
  }, []);

  const completeOnboarding = useCallback(
    async ({ teamName, teamAction, inviteCode, sport }) => {
      if (teamAction === "solo") {
        const data = await apiFetch("/onboarding/solo", {
          method: "POST",
        });
        const team = data.team || {};
        setUser((prev) => ({
          ...prev,
          role: "owner",
          teamId: team.id,
          teamName: team.name,
          sport: "",
          ownerId: prev.id,
          isPersonalTeam: true,
          onboarded: true,
        }));
        setAllTeams([{
          teamId: team.id,
          teamName: team.name,
          sport: "",
          seasonYear: String(new Date().getFullYear()),
          ownerId: team.ownerId,
          isPersonal: true,
          role: "owner",
        }]);
      } else if (teamAction === "create") {
        const data = await apiFetch("/onboarding/create-team", {
          method: "POST",
          body: { teamName, sport },
        });
        const team = data.team || {};
        setUser((prev) => ({
          ...prev,
          role: "coach",
          teamId: team.id,
          teamName: team.name,
          sport: team.sport || "",
          ownerId: prev.id,
          isPersonalTeam: false,
          onboarded: true,
        }));
        setAllTeams([{
          teamId: team.id,
          teamName: team.name,
          sport: team.sport || "",
          seasonYear: String(new Date().getFullYear()),
          ownerId: team.ownerId,
          isPersonal: false,
          role: "owner",
        }]);
      } else {
        const data = await apiFetch("/onboarding/join-team", {
          method: "POST",
          body: { inviteCode },
        });
        const team = data.team || {};
        setUser((prev) => ({
          ...prev,
          role: data.role || "player",
          teamId: team.id,
          teamName: team.name,
          sport: team.sport || "",
          ownerId: team.ownerId || null,
          isPersonalTeam: false,
          onboarded: true,
        }));
        setAllTeams([{
          teamId: team.id,
          teamName: team.name,
          sport: team.sport || "",
          seasonYear: String(new Date().getFullYear()),
          ownerId: team.ownerId,
          isPersonal: false,
          role: data.role || "player",
        }]);
      }
    },
    []
  );

  /**
   * Switch the user's active team. Resets player view mode.
   * @param {string} teamId
   */
  const switchTeam = useCallback(async (teamId) => {
    const data = await apiFetch(`/teams/${teamId}/switch`, { method: "POST" });
    setUser((prev) => applyActiveTeam(prev, data.activeTeam));
    setAllTeams(data.allTeams || []);
    setPlayerViewMode(false);
  }, []);

  /**
   * Join a team via invite code (post-onboarding). Switches to new team.
   * @param {string} inviteCode
   */
  const joinTeam = useCallback(async (inviteCode) => {
    const data = await apiFetch("/teams/join", {
      method: "POST",
      body: { inviteCode },
    });
    setUser((prev) => applyActiveTeam(prev, data.newActiveTeam));
    setAllTeams(data.allTeams || []);
    setPlayerViewMode(false);
    return data;
  }, []);

  /**
   * Create a new real team (post-onboarding). Switches to new team.
   * @param {string} teamName
   * @param {string} [sport]
   */
  const createTeam = useCallback(async (teamName, sport) => {
    const data = await apiFetch("/teams/create", {
      method: "POST",
      body: { teamName, sport },
    });
    setUser((prev) => applyActiveTeam(prev, data.newActiveTeam));
    setAllTeams(data.allTeams || []);
    setPlayerViewMode(false);
    return data;
  }, []);

  /**
   * Create or switch to personal workspace (post-onboarding).
   */
  const createPersonalWorkspace = useCallback(async () => {
    const data = await apiFetch("/teams/create-personal", { method: "POST" });
    setUser((prev) => applyActiveTeam(prev, data.newActiveTeam));
    setAllTeams(data.allTeams || []);
    setPlayerViewMode(false);
    return data;
  }, []);

  /**
   * Leave (or as sole owner, delete) a team.
   * Server auto-creates a personal workspace if no teams remain.
   * Returns { wasTeamDeleted, newActiveTeam, allTeams }.
   * Throws with { needsOwnerTransfer: true } if owner must transfer first.
   * @param {string} teamId
   */
  const leaveTeam = useCallback(async (teamId) => {
    const data = await apiFetch(`/teams/${teamId}/leave`, { method: "POST" });
    setUser((prev) => applyActiveTeam(prev, data.newActiveTeam));
    setAllTeams(data.allTeams || []);
    setPlayerViewMode(false);
    return data;
  }, []);

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
    async (newEmail) => {
      if (!newEmail?.trim()) return false;
      const trimmedEmail = newEmail.trim().toLowerCase();
      if (trimmedEmail === user?.email) return false;
      await apiFetch("/users/me/change-email", {
        method: "POST",
        body: { newEmail: trimmedEmail },
      });
      setPendingEmailChange({
        currentEmail: user?.email || "",
        nextEmail: trimmedEmail,
        requestedAt: Date.now(),
      });
      return true;
    },
    [user?.email]
  );

  const confirmEmailChange = useCallback(
    async (code) => {
      if (!pendingEmailChange?.nextEmail || !code?.trim()) return false;
      const data = await apiFetch("/users/me/confirm-email-change", {
        method: "POST",
        body: { code: code.trim() },
      });
      const nextEmail = data.email || pendingEmailChange.nextEmail;
      setUser((prev) => ({ ...prev, email: nextEmail }));
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === user?.id ? { ...m, email: nextEmail } : m))
      );
      setPendingEmailChange(null);
      return true;
    },
    [pendingEmailChange, user?.id]
  );

  const cancelEmailChange = useCallback(() => setPendingEmailChange(null), []);

  const updateNotificationPreferences = useCallback(
    async (preferences) => {
      if (!user?.teamId) return;
      const body = {};
      if (preferences.playersJoinTeam !== undefined) body.playersJoinTeam = preferences.playersJoinTeam;
      if (preferences.coachesMakeChanges !== undefined) body.coachesMakeChanges = preferences.coachesMakeChanges;
      if (preferences.inviteAccepted !== undefined) body.inviteAccepted = preferences.inviteAccepted;
      if (preferences.newPlays !== undefined) body.newPlays = preferences.newPlays;
      if (preferences.playUpdates !== undefined) body.playUpdates = preferences.playUpdates;
      if (preferences.teamAnnouncements !== undefined) body.teamAnnouncements = preferences.teamAnnouncements;
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
    async ({ teamName, sport, seasonYear }) => {
      if (!user?.teamId) return;
      const body = {};
      if (teamName?.trim()) body.teamName = teamName.trim();
      if (sport?.trim()) body.sport = sport.trim().toLowerCase();
      if (seasonYear?.trim()) body.seasonYear = seasonYear.trim();
      await apiFetch(`/teams/${user.teamId}/settings`, {
        method: "PATCH",
        body,
      }).catch(() => {});
      setUser((prev) => ({
        ...prev,
        teamName: body.teamName || prev.teamName,
        sport: body.sport || prev.sport,
        seasonYear: body.seasonYear || prev.seasonYear,
      }));
      setAllTeams((prev) =>
        prev.map((t) =>
          t.teamId === user.teamId
            ? {
                ...t,
                teamName: body.teamName || t.teamName,
                sport: body.sport || t.sport,
                seasonYear: body.seasonYear || t.seasonYear,
              }
            : t
        )
      );
    },
    [user?.teamId]
  );

  const removeMember = useCallback(
    async (memberId) => {
      if (!user?.teamId || !memberId) return false;
      await apiFetch(`/teams/${user.teamId}/members/${memberId}`, {
        method: "DELETE",
      });
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      return true;
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
      setUser((prev) => ({ ...prev, ownerId: newOwnerId, role: "coach" }));
      return true;
    },
    [user?.id, user?.teamId]
  );

  const logout = useCallback(() => {
    // Tell server to clear the session cookie and remove local token
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setAuthToken(null);
    setUser(null);
    setAllTeams([]);
    setTeamMembers([]);
    setPendingEmailChange(null);
    setPlayerViewMode(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        allTeams,
        loading,
        teamMembers,
        pendingEmailChange,
        playerViewMode,
        setPlayerViewMode,
        login,
        signup,
        refreshUser,
        completeOnboarding,
        switchTeam,
        joinTeam,
        createTeam,
        createPersonalWorkspace,
        leaveTeam,
        updateProfile,
        requestEmailChange,
        confirmEmailChange,
        cancelEmailChange,
        updateNotificationPreferences,
        updateAssistantPermissions,
        updateTeamDefaults,
        removeMember,
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

export default AuthContext;
