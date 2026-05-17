/**
 * In-browser test suite covering every server route added or significantly
 * modified since the last route-test pass. Verifies the URL, HTTP method,
 * headers, and body the client should be sending — caught regressions in
 * any of these are what breaks the admin UI and coach flows in production.
 *
 * Runs against a mocked `globalThis.fetch`, so no network or DB is hit.
 * Surfaces in the admin Tests page as the "API Routes" suite.
 */
import { buildSuite } from "../testRunner";

const API = "http://localhost:3001";
const SESSION = "test-admin-session";
const AUTH = "Bearer test-token";

// ─── Fetch-mock helper ──────────────────────────────────────────────────────

/**
 * Replaces globalThis.fetch with a recorder that returns canned responses.
 * @param {Array<{match: string|RegExp, method?: string, status?: number, body?: any}>} routes
 * @returns {{ calls: Array, restore: () => void }}
 */
function installFetchMock(routes = []) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = (init.method || "GET").toUpperCase();
    const headers = init.headers || {};
    let body = null;
    if (init.body) {
      try { body = JSON.parse(init.body); } catch { body = init.body; }
    }
    calls.push({ url, method, headers, body, init });

    const match = routes.find((r) => {
      if (r.method && r.method.toUpperCase() !== method) return false;
      if (r.match instanceof RegExp) return r.match.test(url);
      return url.includes(r.match);
    });

    const status = match?.status ?? 200;
    const responseBody = match?.body ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseBody,
      text: async () => JSON.stringify(responseBody),
    };
  };
  return {
    calls,
    restore() { globalThis.fetch = originalFetch; },
  };
}

/** Wrap an async test body so the fetch mock is always restored. */
async function withFetchMock(routes, fn) {
  const fm = installFetchMock(routes);
  try {
    await fn(fm);
  } finally {
    fm.restore();
  }
}

// ─── Inline client helpers (mirror what the admin pages send) ────────────────
// These are kept inline so the suite documents the exact contract the server
// expects. If a route changes, the test should fail loudly.

const adminAuthHeaders = (session) => ({
  "Content-Type": "application/json",
  "x-admin-session": session,
});
const userAuthHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: token,
});

// ─── Suite ──────────────────────────────────────────────────────────────────

export default buildSuite(({ describe, it, expect }) => {

  // ════════════════════════════════════════════════════════════════════════
  //  admin.js — admin login, elevation, security-email, danger-mode deletes
  // ════════════════════════════════════════════════════════════════════════
  describe("admin: session & login", () => {
    it("POST /admin/login sends password and returns session", async () => {
      await withFetchMock(
        [{ match: "/admin/login", method: "POST", body: { session: "sid-123" } }],
        async (fm) => {
          const res = await fetch(`${API}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "secret" }),
          });
          const data = await res.json();
          expect(fm.calls[0].url).toContain("/admin/login");
          expect(fm.calls[0].method).toBe("POST");
          expect(fm.calls[0].body.password).toBe("secret");
          expect(data.session).toBe("sid-123");
        }
      );
    }, "Login is the front door to the entire admin dashboard. If this contract drifts, every admin user is locked out.");

    it("GET /admin/session validates the cookie-based session", async () => {
      await withFetchMock(
        [{ match: "/admin/session", method: "GET", body: { session: "sid-123" } }],
        async (fm) => {
          await fetch(`${API}/admin/session`, { credentials: "include" });
          expect(fm.calls[0].method).toBe("GET");
          expect(fm.calls[0].url).toContain("/admin/session");
        }
      );
    }, "Cookie-based auto-login. Used on admin app boot to restore a session without re-prompting for password.");
  });

  describe("admin: Danger Mode elevation", () => {
    it("POST /admin/elevate/request sends password + admin session header", async () => {
      await withFetchMock(
        [{ match: "/admin/elevate/request", method: "POST", body: { elevated: true, elevatedUntil: Date.now() + 600000 } }],
        async (fm) => {
          await fetch(`${API}/admin/elevate/request`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ password: "x" }),
          });
          expect(fm.calls[0].method).toBe("POST");
          expect(fm.calls[0].headers["x-admin-session"]).toBe(SESSION);
          expect(fm.calls[0].body.password).toBe("x");
        }
      );
    }, "Step 1 of Danger Mode. The whole point of Danger Mode is that this is the gate before any destructive admin action.");

    it("POST /admin/elevate/confirm sends the 6-digit code", async () => {
      await withFetchMock(
        [{ match: "/admin/elevate/confirm", method: "POST", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/elevate/confirm`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ code: "123456" }),
          });
          expect(fm.calls[0].body.code).toBe("123456");
        }
      );
    }, "Step 2 of Danger Mode. If the verification code field is renamed, admin lockout follows.");
  });

  describe("admin: security email settings", () => {
    it("GET /admin/settings/security-email retrieves masked email", async () => {
      await withFetchMock(
        [{ match: "/admin/settings/security-email", method: "GET", body: { email: "a*****@x.com", configured: true } }],
        async (fm) => {
          const res = await fetch(`${API}/admin/settings/security-email`, {
            headers: { "x-admin-session": SESSION },
          });
          const data = await res.json();
          expect(fm.calls[0].method).toBe("GET");
          expect(data.configured).toBe(true);
          expect(data.email).toContain("*****");
        }
      );
    });

    it("PUT /admin/settings/security-email submits the new address", async () => {
      await withFetchMock(
        [{ match: "/admin/settings/security-email", method: "PUT", body: { ok: true, codeSent: true } }],
        async (fm) => {
          await fetch(`${API}/admin/settings/security-email`, {
            method: "PUT",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ email: "new@x.com" }),
          });
          expect(fm.calls[0].method).toBe("PUT");
          expect(fm.calls[0].body.email).toBe("new@x.com");
        }
      );
    });

    it("POST /admin/settings/security-email/confirm submits the OTP", async () => {
      await withFetchMock(
        [{ match: "/admin/settings/security-email/confirm", method: "POST", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/settings/security-email/confirm`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ code: "654321" }),
          });
          expect(fm.calls[0].method).toBe("POST");
          expect(fm.calls[0].body.code).toBe("654321");
        }
      );
    });
  });

  describe("admin: user management", () => {
    it("GET /admin/users includes the admin session header", async () => {
      await withFetchMock(
        [{ match: "/admin/users", method: "GET", body: { users: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/users`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/users");
          expect(fm.calls[0].headers["x-admin-session"]).toBe(SESSION);
        }
      );
    });

    it("GET /admin/users/:id/activity returns user details", async () => {
      await withFetchMock(
        [{ match: /\/admin\/users\/[^/]+\/activity/, method: "GET", body: { user: {}, summary: {}, recentPlays: [], activity: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/users/u1/activity`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/users/u1/activity");
        }
      );
    });

    it("DELETE /admin/users/:id sends the admin session header (Danger Mode)", async () => {
      await withFetchMock(
        [{ match: /\/admin\/users\/[^/]+$/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/users/u1`, { method: "DELETE", headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].method).toBe("DELETE");
          expect(fm.calls[0].url).toContain("/admin/users/u1");
        }
      );
    }, "Single-user delete cascades to teams, plays, folders, invites. If this route changes, the admin UI silently 404s and the admin thinks the user wasn't deleted.");

    it("DELETE /admin/users (delete-all) hits the bare /admin/users endpoint", async () => {
      await withFetchMock(
        [{ match: /\/admin\/users$/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/users`, { method: "DELETE", headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toMatch(/\/admin\/users$/);
        }
      );
    }, "Highest-blast-radius route in the entire app. Wipes every user and team. Must require the elevated session header.");

    it("PATCH /admin/users/:id/beta-tester toggles the flag", async () => {
      await withFetchMock(
        [{ match: /\/admin\/users\/[^/]+\/beta-tester/, method: "PATCH", body: { user: { id: "u1", is_beta_tester: true } } }],
        async (fm) => {
          await fetch(`${API}/admin/users/u1/beta-tester`, {
            method: "PATCH",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ isBetaTester: true }),
          });
          expect(fm.calls[0].body.isBetaTester).toBe(true);
        }
      );
    });
  });

  describe("admin: backfill & maintenance", () => {
    it("POST /admin/backfill-seeded-plays fires without a body", async () => {
      await withFetchMock(
        [{ match: "/admin/backfill-seeded-plays", method: "POST", body: { ok: true, updated: 3 } }],
        async (fm) => {
          await fetch(`${API}/admin/backfill-seeded-plays`, {
            method: "POST",
            headers: { "x-admin-session": SESSION },
          });
          expect(fm.calls[0].method).toBe("POST");
        }
      );
    });
  });

  describe("admin: soft-deleted teams", () => {
    it("GET /admin/users/:id/deleted-teams lists trashed teams", async () => {
      await withFetchMock(
        [{ match: /\/admin\/users\/[^/]+\/deleted-teams/, method: "GET", body: { deletedTeams: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/users/u1/deleted-teams`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/users/u1/deleted-teams");
        }
      );
    });

    it("POST /admin/teams/:teamId/restore reactivates a team", async () => {
      await withFetchMock(
        [{ match: /\/admin\/teams\/[^/]+\/restore/, method: "POST", body: { ok: true, team: { id: "t1" } } }],
        async (fm) => {
          await fetch(`${API}/admin/teams/t1/restore`, {
            method: "POST",
            headers: { "x-admin-session": SESSION },
          });
          expect(fm.calls[0].url).toContain("/admin/teams/t1/restore");
          expect(fm.calls[0].method).toBe("POST");
        }
      );
    });
  });

  describe("admin: platform plays & folders", () => {
    it("DELETE /admin/plays/:id requires admin session (Danger Mode delete)", async () => {
      await withFetchMock(
        [{ match: /\/admin\/plays\/[^/]+$/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/plays/p1`, { method: "DELETE", headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].method).toBe("DELETE");
        }
      );
    });

    it("DELETE /admin/platform-folders/:id targets the folder ID", async () => {
      await withFetchMock(
        [{ match: /\/admin\/platform-folders\/[^/]+$/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/platform-folders/f1`, { method: "DELETE", headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/platform-folders/f1");
        }
      );
    });
  });

  describe("admin: admin prefabs", () => {
    it("GET /admin/prefabs returns admin-saved prefabs", async () => {
      await withFetchMock(
        [{ match: "/admin/prefabs", method: "GET", body: { prefabs: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/prefabs`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/prefabs");
        }
      );
    });

    it("POST /admin/prefabs creates with label + prefab_data", async () => {
      await withFetchMock(
        [{ match: "/admin/prefabs", method: "POST", status: 201, body: { prefab: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/prefabs`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ label: "Pre", prefab_data: { x: 1 } }),
          });
          expect(fm.calls[0].body.label).toBe("Pre");
          expect(fm.calls[0].body.prefab_data).toEqual({ x: 1 });
        }
      );
    });

    it("DELETE /admin/prefabs/:id targets the prefab ID", async () => {
      await withFetchMock(
        [{ match: /\/admin\/prefabs\/[^/]+$/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/prefabs/pf1`, { method: "DELETE", headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/prefabs/pf1");
        }
      );
    });
  });

  describe("admin: sport presets", () => {
    it("GET /admin/sport-presets returns the full grouped list", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets$/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-presets`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toMatch(/\/admin\/sport-presets$/);
        }
      );
    });

    it("GET /admin/sport-presets/:sport URL-encodes the sport segment", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets\/Womens%20Lacrosse/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          const sport = "Womens Lacrosse";
          await fetch(`${API}/admin/sport-presets/${encodeURIComponent(sport)}`, {
            headers: { "x-admin-session": SESSION },
          });
          expect(fm.calls[0].url).toContain("Womens%20Lacrosse");
        }
      );
    }, "Sport names like 'Womens Lacrosse' must be URL-encoded — a regression here silently lands every fetch on a bad path.");

    it("GET /admin/sport-presets/:sport/:id targets the preset by ID", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets\/Rugby\/sp-1/, method: "GET", body: { preset: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-presets/Rugby/sp-1`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/sport-presets/Rugby/sp-1");
        }
      );
    });

    it("POST /admin/sport-presets/:sport/reorder sends the ordered ids array", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets\/Rugby\/reorder/, method: "POST", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-presets/Rugby/reorder`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ ids: ["a", "b", "c"] }),
          });
          expect(fm.calls[0].body.ids).toEqual(["a", "b", "c"]);
        }
      );
    });

    it("POST /admin/sport-presets/:sport creates with name + playData", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets\/Rugby$/, method: "POST", status: 201, body: { preset: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-presets/Rugby`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ name: "New", playData: { x: 1 } }),
          });
          expect(fm.calls[0].body.playData).toEqual({ x: 1 });
        }
      );
    });

    it("PATCH /admin/sport-presets/:sport/:id can toggle isHidden", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets\/Rugby\/sp-1/, method: "PATCH", body: { preset: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-presets/Rugby/sp-1`, {
            method: "PATCH",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ isHidden: true }),
          });
          expect(fm.calls[0].body.isHidden).toBe(true);
        }
      );
    });

    it("DELETE /admin/sport-presets/:sport/:id is a Danger Mode action", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-presets\/Rugby\/sp-1/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-presets/Rugby/sp-1`, {
            method: "DELETE",
            headers: { "x-admin-session": SESSION },
          });
          expect(fm.calls[0].method).toBe("DELETE");
        }
      );
    });
  });

  describe("admin: analytics dashboard", () => {
    it("GET /admin/analytics defaults to 30d when no period given", async () => {
      await withFetchMock(
        [{ match: "/admin/analytics", method: "GET", body: { period: "30d", summary: {}, userGrowth: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/analytics`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/analytics");
        }
      );
    });

    it("GET /admin/analytics?period=all passes the period query", async () => {
      await withFetchMock(
        [{ match: "/admin/analytics", method: "GET", body: { period: "all" } }],
        async (fm) => {
          await fetch(`${API}/admin/analytics?period=all`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("period=all");
        }
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  plays.js — new tags + post-to-community routes
  // ════════════════════════════════════════════════════════════════════════
  describe("plays: tags & community post", () => {
    it("GET /teams/:teamId/tags requires user auth", async () => {
      await withFetchMock(
        [{ match: /\/teams\/[^/]+\/tags/, method: "GET", body: { tags: ["Defense", "Offense"] } }],
        async (fm) => {
          const res = await fetch(`${API}/teams/team-1/tags`, { headers: { Authorization: AUTH } });
          const data = await res.json();
          expect(fm.calls[0].url).toContain("/teams/team-1/tags");
          expect(fm.calls[0].headers.Authorization).toBe(AUTH);
          expect(data.tags).toHaveLength(2);
        }
      );
    });

    it("POST /teams/:teamId/plays/:playId/post-to-community sends title + description", async () => {
      await withFetchMock(
        [{ match: /\/post-to-community$/, method: "POST", status: 201, body: { ok: true, platformPlayId: "plat-1" } }],
        async (fm) => {
          await fetch(`${API}/teams/t1/plays/p1/post-to-community`, {
            method: "POST",
            headers: userAuthHeaders(AUTH),
            body: JSON.stringify({ title: "My Best Play", description: "Notes" }),
          });
          expect(fm.calls[0].url).toContain("/teams/t1/plays/p1/post-to-community");
          expect(fm.calls[0].body.title).toBe("My Best Play");
          expect(fm.calls[0].body.description).toBe("Notes");
        }
      );
    }, "Coach community submission flow. The body shape and the path nesting (teams → plays → post-to-community) both need to match the server's requireTeamRole guard.");
  });

  // ════════════════════════════════════════════════════════════════════════
  //  teams.js — create / create-personal / leave (soft-delete)
  // ════════════════════════════════════════════════════════════════════════
  describe("teams: create / create-personal / leave", () => {
    it("POST /teams/create sends teamName + sport", async () => {
      await withFetchMock(
        [{ match: "/teams/create", method: "POST", status: 201, body: { newActiveTeam: { teamId: "t1" }, allTeams: [], inviteCodes: { player: "A", coach: "B" } } }],
        async (fm) => {
          await fetch(`${API}/teams/create`, {
            method: "POST",
            headers: userAuthHeaders(AUTH),
            body: JSON.stringify({ teamName: "Wildcats", sport: "rugby" }),
          });
          expect(fm.calls[0].body.teamName).toBe("Wildcats");
          expect(fm.calls[0].body.sport).toBe("rugby");
        }
      );
    });

    it("POST /teams/create-personal supports optional name + sport overrides", async () => {
      await withFetchMock(
        [{ match: "/teams/create-personal", method: "POST", body: { newActiveTeam: {}, allTeams: [] } }],
        async (fm) => {
          await fetch(`${API}/teams/create-personal`, {
            method: "POST",
            headers: userAuthHeaders(AUTH),
            body: JSON.stringify({ name: "My Workspace", sport: "Field Hockey" }),
          });
          expect(fm.calls[0].body.name).toBe("My Workspace");
          expect(fm.calls[0].body.sport).toBe("Field Hockey");
        }
      );
    }, "create-personal now accepts name + sport; auto-numbering when name is omitted and seedDemoPlay run when sport is supplied are downstream of this.");

    it("POST /teams/:teamId/leave routes to the per-team leave endpoint", async () => {
      await withFetchMock(
        [{ match: /\/teams\/[^/]+\/leave/, method: "POST", body: { ok: true, newActiveTeam: {}, allTeams: [], wasTeamDeleted: true } }],
        async (fm) => {
          const res = await fetch(`${API}/teams/t1/leave`, { method: "POST", headers: { Authorization: AUTH } });
          const data = await res.json();
          expect(fm.calls[0].url).toContain("/teams/t1/leave");
          expect(data.wasTeamDeleted).toBe(true);
        }
      );
    }, "Sole-owner leave now soft-deletes (deleted_at) instead of hard-deleting. The wasTeamDeleted flag is what the UI uses to show the restoration-period messaging.");
  });

  // ════════════════════════════════════════════════════════════════════════
  //  platformPlays.js — folders + copy (active_team_id + analytics fix)
  // ════════════════════════════════════════════════════════════════════════
  describe("platformPlays: folders & copy", () => {
    it("GET /platform-plays/folders requires user auth and returns folder summaries", async () => {
      await withFetchMock(
        [{ match: "/platform-plays/folders", method: "GET", body: { folders: [{ id: "f1", playCount: 4 }] } }],
        async (fm) => {
          await fetch(`${API}/platform-plays/folders`, { headers: { Authorization: AUTH } });
          expect(fm.calls[0].url).toContain("/platform-plays/folders");
          expect(fm.calls[0].headers.Authorization).toBe(AUTH);
        }
      );
    });

    it("GET /platform-plays/folders/:id includes playData for the editor", async () => {
      await withFetchMock(
        [{ match: /\/platform-plays\/folders\/f1$/, method: "GET", body: { folder: { id: "f1" }, plays: [{ id: "p1", playData: {} }] } }],
        async (fm) => {
          const res = await fetch(`${API}/platform-plays/folders/f1`, { headers: { Authorization: AUTH } });
          const data = await res.json();
          expect(fm.calls[0].url).toContain("/platform-plays/folders/f1");
          expect(data.plays[0].playData).toBeTruthy();
        }
      );
    });

    it("POST /platform-plays/:id/copy hits the per-play copy endpoint", async () => {
      await withFetchMock(
        [{ match: /\/platform-plays\/[^/]+\/copy/, method: "POST", status: 201, body: { play: { id: "new-1", teamId: "team-active" } } }],
        async (fm) => {
          await fetch(`${API}/platform-plays/plat-1/copy`, { method: "POST", headers: { Authorization: AUTH } });
          expect(fm.calls[0].url).toContain("/platform-plays/plat-1/copy");
          expect(fm.calls[0].method).toBe("POST");
        }
      );
    }, "Copy now resolves the user's active_team_id and stamps copied_from_platform_play_id so analytics can exclude seeded copies (08f1fce fix).");
  });

  // ════════════════════════════════════════════════════════════════════════
  //  playbookSections.js — public + auth GETs + copy
  // ════════════════════════════════════════════════════════════════════════
  describe("playbookSections: public + auth", () => {
    it("GET /playbook-sections is the public list (no auth header required)", async () => {
      await withFetchMock(
        [{ match: /\/playbook-sections$/, method: "GET", body: { sections: [] } }],
        async (fm) => {
          await fetch(`${API}/playbook-sections`);
          expect(fm.calls[0].method).toBe("GET");
        }
      );
    });

    it("GET /playbook-sections/sport/:sport/plays supports type=platform filter", async () => {
      await withFetchMock(
        [{ match: /\/playbook-sections\/sport\/rugby\/plays/, method: "GET", body: { plays: [], total: 0 } }],
        async (fm) => {
          await fetch(`${API}/playbook-sections/sport/rugby/plays?type=platform&limit=20`);
          expect(fm.calls[0].url).toContain("type=platform");
          expect(fm.calls[0].url).toContain("limit=20");
        }
      );
    });

    it("GET /playbook-sections/sport/:sport/plays accepts type=community filter", async () => {
      await withFetchMock(
        [{ match: /\/playbook-sections\/sport\/rugby\/plays/, method: "GET", body: { plays: [], total: 0 } }],
        async (fm) => {
          await fetch(`${API}/playbook-sections/sport/rugby/plays?type=community`);
          expect(fm.calls[0].url).toContain("type=community");
        }
      );
    });

    it("GET /playbook-sections/:id (single section view) requires auth", async () => {
      await withFetchMock(
        [{ match: /\/playbook-sections\/s1$/, method: "GET", body: { section: {}, plays: [] } }],
        async (fm) => {
          await fetch(`${API}/playbook-sections/s1`, { headers: { Authorization: AUTH } });
          expect(fm.calls[0].headers.Authorization).toBe(AUTH);
        }
      );
    });

    it("POST /playbook-sections/:id/copy supports an optional folderId", async () => {
      await withFetchMock(
        [{ match: /\/playbook-sections\/s1\/copy/, method: "POST", status: 201, body: { plays: [] } }],
        async (fm) => {
          await fetch(`${API}/playbook-sections/s1/copy`, {
            method: "POST",
            headers: userAuthHeaders(AUTH),
            body: JSON.stringify({ folderId: "fold-1" }),
          });
          expect(fm.calls[0].body.folderId).toBe("fold-1");
        }
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  onboarding.js — create-team now seeds demo play
  // ════════════════════════════════════════════════════════════════════════
  describe("onboarding: create-team", () => {
    it("POST /onboarding/create-team sends teamName + sport during signup", async () => {
      await withFetchMock(
        [{ match: "/onboarding/create-team", method: "POST", status: 201, body: { team: {}, role: "owner", inviteCodes: { player: "A", coach: "B" } } }],
        async (fm) => {
          await fetch(`${API}/onboarding/create-team`, {
            method: "POST",
            headers: userAuthHeaders(AUTH),
            body: JSON.stringify({ teamName: "Rookies", sport: "rugby" }),
          });
          expect(fm.calls[0].body.teamName).toBe("Rookies");
          expect(fm.calls[0].body.sport).toBe("rugby");
        }
      );
    }, "Onboarding create-team now seeds the sport's demo play from page_sections. The sport must be sent (not omitted) for seeding to work.");
  });

  // ════════════════════════════════════════════════════════════════════════
  //  demoVideos.js — admin CRUD
  // ════════════════════════════════════════════════════════════════════════
  describe("demoVideos CRUD", () => {
    it("GET /demo-videos is public (no auth header)", async () => {
      await withFetchMock(
        [{ match: /\/demo-videos$/, method: "GET", body: { videos: [] } }],
        async (fm) => {
          await fetch(`${API}/demo-videos`);
          expect(fm.calls[0].method).toBe("GET");
        }
      );
    });

    it("POST /demo-videos creates with title + optional fields", async () => {
      await withFetchMock(
        [{ match: /\/demo-videos$/, method: "POST", status: 201, body: { video: { id: "v1" } } }],
        async (fm) => {
          await fetch(`${API}/demo-videos`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ title: "Intro", youtubeUrl: "https://youtu.be/abc", done: false }),
          });
          expect(fm.calls[0].body.title).toBe("Intro");
          expect(fm.calls[0].body.youtubeUrl).toBe("https://youtu.be/abc");
        }
      );
    });

    it("PATCH /demo-videos/:id targets the video by ID", async () => {
      await withFetchMock(
        [{ match: /\/demo-videos\/v1/, method: "PATCH", body: { video: { id: "v1" } } }],
        async (fm) => {
          await fetch(`${API}/demo-videos/v1`, {
            method: "PATCH",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ done: true }),
          });
          expect(fm.calls[0].url).toContain("/demo-videos/v1");
          expect(fm.calls[0].body.done).toBe(true);
        }
      );
    });

    it("DELETE /demo-videos/:id is Danger Mode (requires elevated session)", async () => {
      await withFetchMock(
        [{ match: /\/demo-videos\/v1/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/demo-videos/v1`, { method: "DELETE", headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].method).toBe("DELETE");
        }
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  prefabs.js — user prefab CRUD
  // ════════════════════════════════════════════════════════════════════════
  describe("user prefabs CRUD", () => {
    it("GET /prefabs returns the user's prefabs", async () => {
      await withFetchMock(
        [{ match: /\/prefabs$/, method: "GET", body: { prefabs: [] } }],
        async (fm) => {
          await fetch(`${API}/prefabs`, { headers: { Authorization: AUTH } });
          expect(fm.calls[0].url).toMatch(/\/prefabs$/);
          expect(fm.calls[0].headers.Authorization).toBe(AUTH);
        }
      );
    });

    it("POST /prefabs sends label + prefab_data", async () => {
      await withFetchMock(
        [{ match: /\/prefabs$/, method: "POST", status: 201, body: { prefab: {} } }],
        async (fm) => {
          await fetch(`${API}/prefabs`, {
            method: "POST",
            headers: userAuthHeaders(AUTH),
            body: JSON.stringify({ label: "My Stack", prefab_data: { shape: "rect" } }),
          });
          expect(fm.calls[0].body.label).toBe("My Stack");
          expect(fm.calls[0].body.prefab_data.shape).toBe("rect");
        }
      );
    });

    it("DELETE /prefabs/:id targets the prefab", async () => {
      await withFetchMock(
        [{ match: /\/prefabs\/pf1/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/prefabs/pf1`, { method: "DELETE", headers: { Authorization: AUTH } });
          expect(fm.calls[0].url).toContain("/prefabs/pf1");
        }
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  admin.js — sport prefab presets (admin-curated, surfaced in Slate Prefabs)
  // ════════════════════════════════════════════════════════════════════════
  describe("admin: sport prefab presets", () => {
    it("GET /admin/sport-prefab-presets returns the full grouped list", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets$/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-prefab-presets`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toMatch(/\/admin\/sport-prefab-presets$/);
        }
      );
    });

    it("GET /admin/sport-prefab-presets/:sport URL-encodes multi-word sports", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets\/Field%20Hockey/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          const sport = "Field Hockey";
          await fetch(`${API}/admin/sport-prefab-presets/${encodeURIComponent(sport)}`, {
            headers: { "x-admin-session": SESSION },
          });
          expect(fm.calls[0].url).toContain("Field%20Hockey");
        }
      );
    }, "Sport names with spaces must be encoded. A regression here lands every fetch on a bad path.");

    it("GET /admin/sport-prefab-presets/:sport/:id targets the prefab preset", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets\/Rugby\/pp-1/, method: "GET", body: { preset: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-prefab-presets/Rugby/pp-1`, { headers: { "x-admin-session": SESSION } });
          expect(fm.calls[0].url).toContain("/admin/sport-prefab-presets/Rugby/pp-1");
        }
      );
    });

    it("POST /admin/sport-prefab-presets/:sport/reorder sends the ordered ids array", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets\/Rugby\/reorder/, method: "POST", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-prefab-presets/Rugby/reorder`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ ids: ["a", "b", "c"] }),
          });
          expect(fm.calls[0].body.ids).toEqual(["a", "b", "c"]);
        }
      );
    });

    it("POST /admin/sport-prefab-presets/:sport creates with name + prefabData", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets\/Rugby$/, method: "POST", status: 201, body: { preset: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-prefab-presets/Rugby`, {
            method: "POST",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ name: "New", prefabData: { players: [{ dx: 0, dy: 0, number: 1 }] } }),
          });
          expect(fm.calls[0].body.name).toBe("New");
          expect(fm.calls[0].body.prefabData.players).toHaveLength(1);
        }
      );
    }, "Create uses prefabData (relative offsets), NOT playData. Server validates that prefabData has at least one player or a ball.");

    it("PATCH /admin/sport-prefab-presets/:sport/:id can toggle isHidden", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets\/Rugby\/pp-1/, method: "PATCH", body: { preset: {} } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-prefab-presets/Rugby/pp-1`, {
            method: "PATCH",
            headers: adminAuthHeaders(SESSION),
            body: JSON.stringify({ isHidden: false }),
          });
          expect(fm.calls[0].body.isHidden).toBe(false);
        }
      );
    });

    it("DELETE /admin/sport-prefab-presets/:sport/:id is a Danger Mode action", async () => {
      await withFetchMock(
        [{ match: /\/admin\/sport-prefab-presets\/Rugby\/pp-1/, method: "DELETE", body: { ok: true } }],
        async (fm) => {
          await fetch(`${API}/admin/sport-prefab-presets/Rugby/pp-1`, {
            method: "DELETE",
            headers: { "x-admin-session": SESSION },
          });
          expect(fm.calls[0].method).toBe("DELETE");
        }
      );
    });
  });

  describe("sportPrefabPresets public listing", () => {
    it("GET /sport-prefab-presets/:sport returns published presets for the sport", async () => {
      await withFetchMock(
        [{ match: /\/sport-prefab-presets\/Rugby/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          await fetch(`${API}/sport-prefab-presets/Rugby`, { headers: { Authorization: AUTH } });
          expect(fm.calls[0].url).toContain("/sport-prefab-presets/Rugby");
        }
      );
    }, "App-facing fetch only returns is_hidden=false rows. Hidden/draft prefab presets must never leak to non-admin users.");

    it("GET /sport-prefab-presets/:sport URL-encodes multi-word sports", async () => {
      await withFetchMock(
        [{ match: /\/sport-prefab-presets\/Field%20Hockey/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          const sport = "Field Hockey";
          await fetch(`${API}/sport-prefab-presets/${encodeURIComponent(sport)}`, {
            headers: { Authorization: AUTH },
          });
          expect(fm.calls[0].url).toContain("Field%20Hockey");
        }
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  sportPresets.js — public per-sport listing
  // ════════════════════════════════════════════════════════════════════════
  describe("sportPresets public listing", () => {
    it("GET /sport-presets/:sport sends the sport in the URL", async () => {
      await withFetchMock(
        [{ match: /\/sport-presets\/Rugby/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          await fetch(`${API}/sport-presets/Rugby`, { headers: { Authorization: AUTH } });
          expect(fm.calls[0].url).toContain("/sport-presets/Rugby");
        }
      );
    });

    it("GET /sport-presets/:sport URL-encodes multi-word sport names", async () => {
      await withFetchMock(
        [{ match: /\/sport-presets\/Field%20Hockey/, method: "GET", body: { presets: [] } }],
        async (fm) => {
          const sport = "Field Hockey";
          await fetch(`${API}/sport-presets/${encodeURIComponent(sport)}`, {
            headers: { Authorization: AUTH },
          });
          expect(fm.calls[0].url).toContain("Field%20Hockey");
        }
      );
    });
  });
});
