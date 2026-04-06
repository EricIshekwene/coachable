/**
 * Seed script: creates a fresh "Coach" demo account and populates it with
 * players, assistant coaches, and animated plays for a product video.
 * Usage: node scripts/seed-account.mjs
 */

const API = process.env.SEED_API_URL || "https://resplendent-inspiration-production-2fa9.up.railway.app";
const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD;

if (!DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error("Error: SEED_DEMO_EMAIL and SEED_DEMO_PASSWORD environment variables must be set.");
  process.exit(1);
}
const DEMO_NAME = "Coach";

const PLAYER_NAMES = [
  "Marcus Webb", "Jordan Ellis", "Tyrese Banks", "Caleb Foster",
  "Damon Price", "Andre Hughes", "Kevin Osei", "Liam Nakamura",
  "Theo Castillo", "Finn McCarthy", "Reuben Clarke", "Ollie Drummond",
];
const COACH_NAMES = ["Derek Stone", "Priya Nair", "Sam Rutledge"];

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

// ── Play data builder ──────────────────────────────────────────────────────
// Field centered at (0,0). +x right, +y down (attacking toward negative y).
// Playable area roughly x:[-400,400], y:[-220,220]

function pt(t, x, y) { return { t, x, y }; }

function buildPlay(title, players5, ballKeyframes, durationMs = 8000, fieldType = "Rugby") {
  const playersById = {};
  const tracks = {};

  for (const [i, p] of players5.entries()) {
    const id = "p" + (i + 1);
    playersById[id] = {
      id,
      x: p.path[0].x,
      y: p.path[0].y,
      number: p.number,
      name: p.name,
      assignment: p.assignment || "",
      color: COLORS[i % COLORS.length],
    };
    tracks[id] = { keyframes: p.path };
  }

  const ballId = "ball-1";
  tracks[ballId] = { keyframes: ballKeyframes };
  const b0 = ballKeyframes[0];

  return {
    schemaVersion: "play-export-v2",
    play: {
      entities: {
        playersById,
        representedPlayerIds: players5.map((_, i) => "p" + (i + 1)),
        ball: { id: ballId, x: b0.x, y: b0.y },
        ballsById: { [ballId]: { id: ballId, x: b0.x, y: b0.y } },
      },
      animation: {
        durationMs,
        tracks,
        meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      },
      drawings: [],
      settings: {
        advancedSettings: {
          pitch: { fieldType, pitchColor: "#3a7d44", fieldOpacity: 100, showMarkings: true },
          players: { baseSizePx: 30 },
          ball: { sizePercent: 100 },
        },
        allPlayersDisplay: { showNumber: true, sizePercent: 100 },
      },
      canvas: {
        camera: { x: 0, y: 0, zoom: 1 },
        fieldRotation: 0,
        coordinateSystem: { origin: "center", units: "px", notes: "+x right, +y down" },
      },
    },
  };
}

// ── 15 plays ───────────────────────────────────────────────────────────────

const PLAYS = [
  // 1. Sweep Left — backline sweep, ball travels left
  {
    title: "Sweep Left",
    tags: ["attack", "set-piece"],
    data: buildPlay("Sweep Left", [
      { number:"9",  name:"Webb",    assignment:"Pass",
        path:[pt(0,-30,80),pt(2000,-60,40),pt(5000,-90,0),pt(8000,-110,-60)] },
      { number:"10", name:"Ellis",   assignment:"Carry",
        path:[pt(0,-100,65),pt(2000,-130,25),pt(5000,-165,-35),pt(8000,-185,-95)] },
      { number:"12", name:"Banks",   assignment:"Support",
        path:[pt(0,-170,60),pt(3000,-205,10),pt(6000,-230,-55),pt(8000,-245,-115)] },
      { number:"13", name:"Foster",  assignment:"Wrap",
        path:[pt(0,-240,55),pt(3500,-270,0),pt(6500,-290,-65),pt(8000,-300,-125)] },
      { number:"14", name:"Price",   assignment:"Finish",
        path:[pt(0,-305,50),pt(4000,-330,-10),pt(7000,-340,-80),pt(8000,-342,-140)] },
    ],
    [pt(0,-30,75),pt(1800,-110,55),pt(3500,-195,5),pt(5500,-255,-50),pt(8000,-335,-130)]),
  },

  // 2. Power Drive Right — crash ball then release wide
  {
    title: "Power Drive Right",
    tags: ["attack", "open-play"],
    data: buildPlay("Power Drive Right", [
      { number:"8",  name:"Webb",    assignment:"Carry",
        path:[pt(0,0,95),pt(2000,20,40),pt(5000,55,-25),pt(8000,85,-85)] },
      { number:"6",  name:"Ellis",   assignment:"Bind",
        path:[pt(0,-40,90),pt(2000,-10,45),pt(5000,30,-15),pt(8000,65,-65)] },
      { number:"7",  name:"Banks",   assignment:"Bind",
        path:[pt(0,40,90),pt(2000,55,45),pt(5000,75,-15),pt(8000,100,-65)] },
      { number:"12", name:"Foster",  assignment:"Release",
        path:[pt(0,110,70),pt(3000,140,20),pt(6000,175,-50),pt(8000,200,-110)] },
      { number:"11", name:"Price",   assignment:"Wide",
        path:[pt(0,200,60),pt(3000,225,10),pt(6000,245,-60),pt(8000,265,-130)] },
    ],
    [pt(0,0,90),pt(2500,30,30),pt(5500,155,-45),pt(8000,258,-120)]),
  },

  // 3. Counter Blind Side — attack short side off ruck
  {
    title: "Counter Blind Side",
    tags: ["defense", "open-play"],
    data: buildPlay("Counter Blind Side", [
      { number:"9",  name:"Webb",    assignment:"Snipe",
        path:[pt(0,30,70),pt(1500,60,20),pt(4000,80,-50),pt(7000,90,-120)] },
      { number:"7",  name:"Ellis",   assignment:"Support",
        path:[pt(0,-10,80),pt(2000,40,30),pt(5000,65,-40),pt(7000,75,-100)] },
      { number:"6",  name:"Banks",   assignment:"Carry",
        path:[pt(0,-55,85),pt(2500,10,40),pt(5500,45,-30),pt(7000,60,-95)] },
      { number:"12", name:"Foster",  assignment:"Decoy",
        path:[pt(0,-120,60),pt(2000,-90,10),pt(5000,-70,-60),pt(7000,-60,-120)] },
      { number:"10", name:"Price",   assignment:"Block",
        path:[pt(0,-200,55),pt(2000,-170,5),pt(5000,-150,-65),pt(7000,-140,-125)] },
    ],
    [pt(0,30,65),pt(2000,70,10),pt(4500,85,-60),pt(7000,88,-115)], 7000),
  },

  // 4. Pick and Drive — tight maul through the middle
  {
    title: "Pick and Drive",
    tags: ["attack", "lineout"],
    data: buildPlay("Pick and Drive", [
      { number:"8",  name:"Webb",    assignment:"Pick",
        path:[pt(0,0,80),pt(2000,5,30),pt(5000,10,-40),pt(8000,15,-100)] },
      { number:"4",  name:"Ellis",   assignment:"Bind",
        path:[pt(0,-25,85),pt(2000,-15,35),pt(5000,-5,-35),pt(8000,5,-95)] },
      { number:"5",  name:"Banks",   assignment:"Bind",
        path:[pt(0,25,85),pt(2000,20,35),pt(5000,20,-35),pt(8000,22,-95)] },
      { number:"6",  name:"Foster",  assignment:"Support",
        path:[pt(0,-50,80),pt(2000,-35,30),pt(5000,-20,-40),pt(8000,-10,-100)] },
      { number:"7",  name:"Price",   assignment:"Support",
        path:[pt(0,50,80),pt(2000,38,30),pt(5000,28,-40),pt(8000,28,-100)] },
    ],
    [pt(0,0,75),pt(2000,8,25),pt(5000,13,-45),pt(8000,17,-98)]),
  },

  // 5. Skip Pass Wide — fly half skips to 13
  {
    title: "Skip Pass Wide",
    tags: ["attack", "scrum"],
    data: buildPlay("Skip Pass Wide", [
      { number:"9",  name:"Webb",    assignment:"Pass",
        path:[pt(0,-20,80),pt(1500,-40,55),pt(4000,-70,20),pt(8000,-90,-40)] },
      { number:"10", name:"Ellis",   assignment:"Dummy",
        path:[pt(0,-90,65),pt(2000,-110,30),pt(5000,-125,-30),pt(8000,-130,-90)] },
      { number:"13", name:"Banks",   assignment:"Carry",
        path:[pt(0,-170,60),pt(2500,-200,15),pt(5500,-220,-55),pt(8000,-230,-115)] },
      { number:"11", name:"Foster",  assignment:"Finish",
        path:[pt(0,-260,55),pt(3000,-285,5),pt(6000,-300,-65),pt(8000,-305,-130)] },
      { number:"14", name:"Price",   assignment:"Support",
        path:[pt(0,50,60),pt(3000,30,10),pt(6000,20,-55),pt(8000,10,-110)] },
    ],
    [pt(0,-20,75),pt(2000,-175,55),pt(5000,-225,-45),pt(8000,-300,-120)]),
  },

  // 6. Crash Ball Center — #12 crashes then offloads
  {
    title: "Crash Ball Center",
    tags: ["attack", "open-play"],
    data: buildPlay("Crash Ball Center", [
      { number:"10", name:"Webb",    assignment:"Pass",
        path:[pt(0,-40,75),pt(1500,-50,50),pt(4000,-65,15),pt(7000,-80,-50)] },
      { number:"12", name:"Ellis",   assignment:"Crash",
        path:[pt(0,0,65),pt(2000,5,20),pt(5000,10,-40),pt(7000,12,-90)] },
      { number:"13", name:"Banks",   assignment:"Offload",
        path:[pt(0,60,65),pt(3000,55,15),pt(6000,50,-50),pt(7000,48,-90)] },
      { number:"6",  name:"Foster",  assignment:"Support",
        path:[pt(0,-30,85),pt(2000,-10,40),pt(5000,5,-30),pt(7000,10,-80)] },
      { number:"7",  name:"Price",   assignment:"Support",
        path:[pt(0,40,85),pt(2000,30,40),pt(5000,25,-30),pt(7000,22,-80)] },
    ],
    [pt(0,-40,70),pt(1800,5,55),pt(3500,8,10),pt(5500,52,-45),pt(7000,50,-88)], 7000),
  },

  // 7. Dummy Switch — fake switch play
  {
    title: "Dummy Switch",
    tags: ["attack", "open-play"],
    data: buildPlay("Dummy Switch", [
      { number:"10", name:"Webb",    assignment:"Carry",
        path:[pt(0,-30,70),pt(1800,-20,30),pt(4000,30,-20),pt(8000,80,-80)] },
      { number:"12", name:"Ellis",   assignment:"Dummy",
        path:[pt(0,30,65),pt(2000,50,20),pt(5000,60,-40),pt(8000,65,-100)] },
      { number:"13", name:"Banks",   assignment:"Switch",
        path:[pt(0,90,60),pt(2000,40,25),pt(5000,-10,-40),pt(8000,-40,-110)] },
      { number:"11", name:"Foster",  assignment:"Wide",
        path:[pt(0,190,55),pt(2500,170,5),pt(6000,155,-65),pt(8000,150,-125)] },
      { number:"9",  name:"Price",   assignment:"Halfback",
        path:[pt(0,-100,90),pt(2000,-80,55),pt(5000,-70,10),pt(8000,-65,-40)] },
    ],
    [pt(0,-30,65),pt(2500,25,20),pt(5000,-5,-45),pt(8000,-38,-105)]),
  },

  // 8. Grubber Kick Chase — kick through and chase
  {
    title: "Grubber Kick Chase",
    tags: ["kick", "attack"],
    data: buildPlay("Grubber Kick Chase", [
      { number:"10", name:"Webb",    assignment:"Kick",
        path:[pt(0,-20,80),pt(2000,-10,30),pt(5000,10,-60),pt(8000,30,-140)] },
      { number:"9",  name:"Ellis",   assignment:"Chase",
        path:[pt(0,-60,85),pt(2000,-40,40),pt(5000,-10,-50),pt(8000,15,-130)] },
      { number:"7",  name:"Banks",   assignment:"Chase",
        path:[pt(0,40,85),pt(2000,30,40),pt(5000,20,-50),pt(8000,25,-130)] },
      { number:"6",  name:"Foster",  assignment:"Support",
        path:[pt(0,-110,80),pt(2000,-90,35),pt(5000,-50,-55),pt(8000,-30,-125)] },
      { number:"8",  name:"Price",   assignment:"Support",
        path:[pt(0,100,80),pt(2000,85,35),pt(5000,55,-55),pt(8000,40,-125)] },
    ],
    [pt(0,-20,75),pt(500,-15,20),pt(1500,0,-80),pt(4000,5,-160),pt(8000,8,-200)]),
  },

  // 9. Overlap Shift — create 3v2 right edge
  {
    title: "Overlap Shift",
    tags: ["attack", "set-piece"],
    data: buildPlay("Overlap Shift", [
      { number:"10", name:"Webb",    assignment:"Fix",
        path:[pt(0,-80,70),pt(2000,-60,25),pt(5000,-40,-40),pt(8000,-30,-100)] },
      { number:"12", name:"Ellis",   assignment:"Pass",
        path:[pt(0,0,65),pt(2000,20,20),pt(5000,40,-45),pt(8000,55,-105)] },
      { number:"13", name:"Banks",   assignment:"Carry",
        path:[pt(0,80,60),pt(2500,110,10),pt(5500,135,-55),pt(8000,150,-115)] },
      { number:"11", name:"Foster",  assignment:"Overlap",
        path:[pt(0,175,55),pt(3000,205,0),pt(6000,225,-65),pt(8000,235,-130)] },
      { number:"14", name:"Price",   assignment:"Wide",
        path:[pt(0,270,50),pt(3500,290,-5),pt(6500,300,-70),pt(8000,305,-135)] },
    ],
    [pt(0,-80,65),pt(2000,5,55),pt(4000,90,5),pt(6000,175,-50),pt(8000,300,-128)]),
  },

  // 10. Loop Runner Play — prop loops around the ruck
  {
    title: "Loop Runner Play",
    tags: ["attack", "open-play"],
    data: buildPlay("Loop Runner Play", [
      { number:"9",  name:"Webb",    assignment:"Pass",
        path:[pt(0,0,85),pt(1500,-20,55),pt(4000,-40,15),pt(8000,-55,-50)] },
      { number:"10", name:"Ellis",   assignment:"Hold",
        path:[pt(0,-70,70),pt(2000,-80,30),pt(5000,-90,-30),pt(8000,-95,-90)] },
      { number:"1",  name:"Banks",   assignment:"Loop",
        path:[pt(0,-120,80),pt(2000,-80,60),pt(4000,-20,40),pt(6000,30,10),pt(8000,50,-60)] },
      { number:"12", name:"Foster",  assignment:"Carry",
        path:[pt(0,50,65),pt(3000,70,15),pt(6000,80,-55),pt(8000,85,-110)] },
      { number:"13", name:"Price",   assignment:"Wide",
        path:[pt(0,140,60),pt(3000,150,10),pt(6000,155,-55),pt(8000,160,-115)] },
    ],
    [pt(0,0,80),pt(2000,-40,65),pt(4500,45,35),pt(7000,82,-50),pt(8000,85,-105)]),
  },

  // 11. Short Side Wrap — wrap around a ruck on the short side
  {
    title: "Short Side Wrap",
    tags: ["attack", "lineout"],
    data: buildPlay("Short Side Wrap", [
      { number:"8",  name:"Webb",    assignment:"Pick",
        path:[pt(0,0,90),pt(1800,10,40),pt(4500,20,-30),pt(7000,30,-100)] },
      { number:"9",  name:"Ellis",   assignment:"Pass",
        path:[pt(0,-30,80),pt(1500,-20,45),pt(4000,-10,-20),pt(7000,0,-80)] },
      { number:"7",  name:"Banks",   assignment:"Wrap",
        path:[pt(0,80,70),pt(2000,60,30),pt(4500,40,-40),pt(7000,30,-105)] },
      { number:"6",  name:"Foster",  assignment:"Carry",
        path:[pt(0,120,65),pt(2500,100,15),pt(5500,80,-55),pt(7000,70,-115)] },
      { number:"12", name:"Price",   assignment:"Decoy",
        path:[pt(0,-90,65),pt(2000,-100,20),pt(5000,-105,-50),pt(7000,-108,-105)] },
    ],
    [pt(0,0,85),pt(2500,-15,42),pt(5000,35,-30),pt(7000,35,-100)], 7000),
  },

  // 12. Lineout Maul Drive — lineout into driving maul
  {
    title: "Lineout Maul Drive",
    tags: ["attack", "set-piece"],
    data: buildPlay("Lineout Maul Drive", [
      { number:"2",  name:"Webb",    assignment:"Throw",
        path:[pt(0,-130,50),pt(3000,-100,20),pt(6000,-70,-40),pt(9000,-60,-100)] },
      { number:"4",  name:"Ellis",   assignment:"Jump",
        path:[pt(0,0,60),pt(1500,0,30),pt(4000,5,-20),pt(7000,10,-80),pt(9000,12,-120)] },
      { number:"5",  name:"Banks",   assignment:"Lift",
        path:[pt(0,40,65),pt(2000,35,30),pt(5000,30,-25),pt(8000,28,-85),pt(9000,26,-115)] },
      { number:"6",  name:"Foster",  assignment:"Drive",
        path:[pt(0,-40,65),pt(2000,-35,30),pt(5000,-25,-25),pt(8000,-20,-85),pt(9000,-18,-115)] },
      { number:"8",  name:"Price",   assignment:"Peel",
        path:[pt(0,-90,65),pt(3000,-50,25),pt(6000,-15,-35),pt(9000,-5,-100)] },
    ],
    [pt(0,0,55),pt(1500,0,25),pt(4000,8,-25),pt(7000,11,-85),pt(9000,13,-120)], 9000),
  },

  // 13. Scrum Breakaway — #8 picks at scrum, flanker breaks blind side
  {
    title: "Scrum Breakaway",
    tags: ["attack", "scrum"],
    data: buildPlay("Scrum Breakaway", [
      { number:"8",  name:"Webb",    assignment:"Carry",
        path:[pt(0,30,70),pt(2000,45,25),pt(5000,65,-45),pt(7000,80,-100)] },
      { number:"7",  name:"Ellis",   assignment:"Breakaway",
        path:[pt(0,80,75),pt(1500,100,35),pt(4500,130,-30),pt(7000,150,-90)] },
      { number:"9",  name:"Banks",   assignment:"Feed",
        path:[pt(0,-30,65),pt(2000,-20,30),pt(5000,0,-30),pt(7000,10,-80)] },
      { number:"6",  name:"Foster",  assignment:"Support",
        path:[pt(0,-70,70),pt(2500,-50,30),pt(5500,-20,-35),pt(7000,0,-90)] },
      { number:"10", name:"Price",   assignment:"Attack",
        path:[pt(0,-140,60),pt(2500,-120,15),pt(5500,-95,-50),pt(7000,-80,-105)] },
    ],
    [pt(0,30,65),pt(2500,50,20),pt(5500,120,-40),pt(7000,145,-88)], 7000),
  },

  // 14. Kick and Chase — box kick, spread and chase
  {
    title: "Kick and Chase",
    tags: ["kick", "attack"],
    data: buildPlay("Kick and Chase", [
      { number:"9",  name:"Webb",    assignment:"Kick",
        path:[pt(0,0,75),pt(2000,10,30),pt(5000,20,-50),pt(8000,30,-130)] },
      { number:"10", name:"Ellis",   assignment:"Chase",
        path:[pt(0,-60,70),pt(2000,-40,25),pt(5000,-20,-55),pt(8000,0,-135)] },
      { number:"15", name:"Banks",   assignment:"Chase",
        path:[pt(0,60,70),pt(2000,50,25),pt(5000,40,-55),pt(8000,35,-135)] },
      { number:"7",  name:"Foster",  assignment:"Chase",
        path:[pt(0,-120,65),pt(2500,-95,15),pt(5500,-65,-60),pt(8000,-50,-130)] },
      { number:"6",  name:"Price",   assignment:"Chase",
        path:[pt(0,130,65),pt(2500,105,15),pt(5500,75,-60),pt(8000,60,-130)] },
    ],
    [pt(0,0,70),pt(500,5,0),pt(1500,8,-100),pt(4000,10,-190),pt(8000,10,-220)]),
  },

  // 15. Offload in Contact — carry into contact, offload to support
  {
    title: "Offload in Contact",
    tags: ["attack", "open-play"],
    data: buildPlay("Offload in Contact", [
      { number:"12", name:"Webb",    assignment:"Carry+Offload",
        path:[pt(0,-20,70),pt(2000,-10,20),pt(5000,0,-40),pt(8000,5,-80)] },
      { number:"13", name:"Ellis",   assignment:"Receive",
        path:[pt(0,40,65),pt(3000,60,10),pt(6000,75,-55),pt(8000,80,-100)] },
      { number:"11", name:"Banks",   assignment:"Wide",
        path:[pt(0,120,60),pt(3500,140,5),pt(6500,155,-60),pt(8000,160,-110)] },
      { number:"10", name:"Foster",  assignment:"Decoy",
        path:[pt(0,-80,65),pt(2000,-90,20),pt(5000,-100,-45),pt(8000,-105,-95)] },
      { number:"9",  name:"Price",   assignment:"Link",
        path:[pt(0,-130,80),pt(2000,-110,45),pt(5000,-80,-10),pt(8000,-60,-65)] },
    ],
    [pt(0,-20,65),pt(2500,0,15),pt(4500,65,5),pt(7000,77,-60),pt(8000,80,-98)]),
  },
];

// ── HTTP helpers ───────────────────────────────────────────────────────────

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}
const post = (path, body, token) => req("POST", path, body, token);
const get  = (path, token)       => req("GET",  path, undefined, token);

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  let token;

  console.log(`→ Creating account for ${DEMO_EMAIL}…`);
  try {
    const data = await post("/auth/signup", { name: DEMO_NAME, email: DEMO_EMAIL, password: DEMO_PASSWORD });
    token = data.token;
    console.log("✓ Account created.");
  } catch (err) {
    if (err.message.includes("409") || err.message.toLowerCase().includes("already")) {
      console.log("  (account exists — logging in)");
      const data = await post("/auth/login", { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      token = data.token;
      if (data.user?.teamId) {
        console.log(`✓ Logged in. Existing team: ${data.user.teamName}`);
        await populateTeam(token, data.user.teamId);
        return;
      }
    } else throw err;
  }

  console.log("→ Creating team…");
  const teamData = await post("/onboarding/create-team", { teamName: "Demo Squad", sport: "Rugby" }, token);
  const teamId = teamData.team.id;
  console.log(`✓ Team: ${teamData.team.name} (${teamId})`);

  await populateTeam(token, teamId);
}

async function populateTeam(ownerToken, teamId) {
  const { codes } = await get(`/teams/${teamId}/invite-codes`, ownerToken);
  console.log(`✓ Codes — player: ${codes.player}  coach: ${codes.coach}`);

  console.log(`\n→ Adding ${PLAYER_NAMES.length} players…`);
  for (const name of PLAYER_NAMES) {
    const slug  = name.toLowerCase().replace(/\s+/g, ".");
    const email = `${slug}.player@coachable-seed.invalid`;
    try {
      const s = await post("/auth/signup", { name, email, password: "SeedPass123!" });
      await post("/onboarding/join-team", { inviteCode: codes.player }, s.token);
      console.log(`  ✓ ${name}`);
    } catch (e) { console.log(`  ~ ${name}: ${e.message}`); }
  }

  console.log(`\n→ Adding ${COACH_NAMES.length} assistant coaches…`);
  for (const name of COACH_NAMES) {
    const slug  = name.toLowerCase().replace(/\s+/g, ".");
    const email = `${slug}.coach@coachable-seed.invalid`;
    try {
      const s = await post("/auth/signup", { name, email, password: "SeedPass123!" });
      await post("/onboarding/join-team", { inviteCode: codes.coach }, s.token);
      console.log(`  ✓ ${name} (assistant_coach)`);
    } catch (e) { console.log(`  ~ ${name}: ${e.message}`); }
  }

  console.log(`\n→ Creating ${PLAYS.length} plays…`);
  for (const { title, tags, data } of PLAYS) {
    try {
      await post(`/teams/${teamId}/plays`, { title, tags, playData: data }, ownerToken);
      console.log(`  ✓ "${title}" [${tags.join(", ")}]`);
    } catch (e) { console.log(`  ~ "${title}": ${e.message}`); }
  }

  console.log(`\n✓ Done!\n  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
