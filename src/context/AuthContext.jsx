/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

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

const DEFAULT_SEASON_YEAR = String(new Date().getFullYear());

const MOCK_USERS = {
  coach: {
    id: "u1",
    name: "Coach Williams",
    email: "coach@coachable.app",
    role: "coach",
    teamId: "t1",
    teamName: "Riverside Rugby",
    sport: "rugby",
    seasonYear: DEFAULT_SEASON_YEAR,
    teamLogo: "",
    ownerId: "u1",
    onboarded: true,
  },
  player: {
    id: "u2",
    name: "Jake Miller",
    email: "jake@coachable.app",
    role: "player",
    teamId: "t1",
    teamName: "Riverside Rugby",
    sport: "rugby",
    seasonYear: DEFAULT_SEASON_YEAR,
    teamLogo: "",
    ownerId: "u1",
    onboarded: true,
  },
};

const DEFAULT_TEAM_MEMBERS = [
  { id: "u1", name: "Coach Williams", role: "coach", email: "coach@coachable.app" },
  { id: "u2", name: "Jake Miller", role: "player", email: "jake@coachable.app" },
  { id: "u3", name: "Sam Torres", role: "player", email: "sam@coachable.app" },
  { id: "u4", name: "Alex Chen", role: "player", email: "alex@coachable.app" },
];

function withDefaultUserSettings(profile) {
  return {
    ...profile,
    seasonYear: profile.seasonYear || DEFAULT_SEASON_YEAR,
    teamLogo: profile.teamLogo || "",
    ownerId: profile.ownerId || profile.id,
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(profile.notifications || {}),
    },
    assistantPermissions: {
      ...DEFAULT_ASSISTANT_PERMISSIONS,
      ...(profile.assistantPermissions || {}),
    },
  };
}

function updateMemberInList(members, memberId, updates) {
  return members.map((member) => (member.id === memberId ? { ...member, ...updates } : member));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(withDefaultUserSettings(MOCK_USERS.coach));
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM_MEMBERS);
  const [pendingEmailChange, setPendingEmailChange] = useState(null);

  const login = (email) => {
    // Mock: coach email picks coach profile, everything else picks player profile
    const profile = email.includes("coach") ? MOCK_USERS.coach : MOCK_USERS.player;
    const nextUser = withDefaultUserSettings({ ...profile, email });

    setUser(nextUser);
    setTeamMembers(DEFAULT_TEAM_MEMBERS);
    setPendingEmailChange(null);

    return nextUser;
  };

  const signup = (name, email) => {
    const nextUser = withDefaultUserSettings({
      id: "u-new",
      name,
      email,
      role: null,
      teamId: null,
      teamName: null,
      sport: "",
      onboarded: false,
      ownerId: null,
    });

    setUser(nextUser);
    setTeamMembers([{ id: nextUser.id, name: nextUser.name, role: "pending", email: nextUser.email }]);
    setPendingEmailChange(null);
  };

  const completeOnboarding = ({ teamName, teamAction, role, sport }) => {
    setUser((prev) =>
      withDefaultUserSettings({
        ...prev,
        role,
        teamId: teamAction === "create" ? "t-" + Date.now() : "t1",
        teamName: teamAction === "create" ? teamName : "Joined Team",
        sport,
        ownerId: teamAction === "create" ? prev.id : "u1",
        onboarded: true,
      }),
    );

    setTeamMembers((prevMembers) => {
      if (teamAction === "create") {
        return [{ id: user?.id || "u-new", name: user?.name || "Coach", role, email: user?.email || "" }];
      }

      const memberExists = prevMembers.some((member) => member.id === user?.id);
      if (memberExists) {
        return updateMemberInList(prevMembers, user?.id, {
          role,
          email: user?.email || "",
          name: user?.name || "",
        });
      }

      return [
        ...DEFAULT_TEAM_MEMBERS,
        { id: user?.id || "u-new", name: user?.name || "New Member", role, email: user?.email || "" },
      ];
    });
  };

  const updateProfile = ({ name }) => {
    if (!name?.trim()) return false;

    const trimmedName = name.trim();
    const userId = user?.id;

    setUser((prev) => ({ ...prev, name: trimmedName }));
    if (userId) {
      setTeamMembers((prev) => updateMemberInList(prev, userId, { name: trimmedName }));
    }

    return true;
  };

  const requestEmailChange = (newEmail) => {
    if (!newEmail?.trim()) return false;

    const trimmedEmail = newEmail.trim().toLowerCase();
    if (trimmedEmail === user?.email) return false;

    setPendingEmailChange({
      currentEmail: user?.email || "",
      nextEmail: trimmedEmail,
      requestedAt: Date.now(),
    });

    return true;
  };

  const confirmEmailChange = () => {
    if (!pendingEmailChange?.nextEmail) return false;

    const userId = user?.id;
    const nextEmail = pendingEmailChange.nextEmail;

    setUser((prev) => ({ ...prev, email: nextEmail }));
    if (userId) {
      setTeamMembers((prev) => updateMemberInList(prev, userId, { email: nextEmail }));
    }
    setPendingEmailChange(null);

    return true;
  };

  const cancelEmailChange = () => setPendingEmailChange(null);

  const updateNotificationPreferences = (preferences) => {
    setUser((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        ...preferences,
      },
    }));
  };

  const updateAssistantPermissions = (permissions) => {
    setUser((prev) => ({
      ...prev,
      assistantPermissions: {
        ...prev.assistantPermissions,
        ...permissions,
      },
    }));
  };

  const updateTeamDefaults = ({ teamName, sport, teamLogo, seasonYear }) => {
    setUser((prev) => ({
      ...prev,
      teamName: teamName?.trim() ? teamName.trim() : prev.teamName,
      sport: sport?.trim() ? sport.trim().toLowerCase() : prev.sport,
      teamLogo: teamLogo?.trim() ? teamLogo.trim() : "",
      seasonYear: seasonYear?.trim() ? seasonYear.trim() : prev.seasonYear,
    }));
  };

  const transferOwnership = (newOwnerId) => {
    if (!newOwnerId || newOwnerId === user?.id) return false;

    const memberExists = teamMembers.some((member) => member.id === newOwnerId);
    if (!memberExists) return false;

    setUser((prev) => ({ ...prev, ownerId: newOwnerId }));
    return true;
  };

  const logout = () => {
    setUser(null);
    setPendingEmailChange(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        teamMembers,
        pendingEmailChange,
        login,
        signup,
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
