# Coachable

A full-stack sports play designer and team playbook platform. Coaches create animated plays on a Konva-based canvas, organize them into team playbooks, and share them with players. Built with React + Vite on the frontend and Node.js + PostgreSQL on the backend.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, react-konva 19 |
| Backend | Node.js, Express, PostgreSQL |
| Auth | JWT + httpOnly session cookies |
| Email | Resend |
| Deployment | Railway |
| Testing | Vitest 4 |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### Environment Variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
RESEND_API_KEY=re_...
REQUIRE_EMAIL_VERIFICATION=false   # set to true to enforce email verification
PORT=3001
```

### Run (Development)

```bash
# Frontend (port 5173)
npm run dev

# Backend (port 3001) — in a separate terminal
cd server && npm run dev
```

### Database Migration

```bash
cd server && node db/migrate.js
```

---

## Project Structure

```
coachable/
├── src/                            # Frontend (React + Vite)
│   ├── App.jsx                     # Router, auth guards, route definitions
│   ├── context/
│   │   └── AuthContext.jsx         # Global auth state, team state, all auth actions
│   ├── layouts/
│   │   └── AppLayout.jsx           # App shell: sidebar, bottom nav, player view banner
│   ├── pages/
│   │   ├── Landing.jsx             # Public landing page
│   │   ├── Signup.jsx / Login.jsx  # Auth pages
│   │   ├── Onboarding.jsx          # First-run: create team / join team / solo
│   │   ├── NoTeam.jsx              # Safety net for onboarded users with no teams
│   │   └── app/
│   │       ├── Plays.jsx           # Play library (coach: edit; player: view-only)
│   │       ├── PlayView.jsx        # In-app play viewer
│   │       ├── Team.jsx            # Team management, invite codes, member list
│   │       ├── Profile.jsx         # User profile, ownership transfer
│   │       └── Settings.jsx        # Notifications, team defaults, danger zone (leave/delete)
│   ├── components/
│   │   ├── TeamSwitcher.jsx        # Sidebar dropdown: switch teams, join, create
│   │   ├── MessagePopup/           # Toast notifications
│   │   ├── controlPill/            # Timeline playback controller
│   │   ├── sidebar/                # Left panel sections
│   │   ├── rightPanel/             # Right panel sections
│   │   └── advancedSettings/       # Advanced settings modal sections
│   ├── features/slate/             # Canvas play editor feature
│   │   ├── Slate.jsx               # Top-level wiring
│   │   └── hooks/
│   │       ├── useSlateEntities.js # Players, ball, selection, drag
│   │       ├── useSlateHistory.js  # Undo/redo
│   │       ├── useFieldViewport.js # Camera, zoom, rotation
│   │       └── useAdvancedSettings.js
│   ├── canvas/                     # Konva canvas rendering
│   │   ├── KonvaCanvasRoot.jsx     # Stage, items, pan/zoom, marquee, snapping
│   │   └── hooks/
│   │       ├── useCanvasSize.js
│   │       ├── useCanvasPan.js
│   │       ├── useCanvasMarquee.js
│   │       └── useCanvasSnapping.js
│   ├── animation/                  # Animation engine
│   │   ├── engine.js               # RAF-driven playback
│   │   ├── interpolate.js          # Pose interpolation between keyframes
│   │   ├── schema.js               # Data normalization, keyframe helpers
│   │   └── serialize.js            # JSON import/export
│   └── utils/
│       ├── api.js                  # Fetch wrapper
│       ├── exportPlay.js           # Build + download play JSON
│       └── importPlay.js           # Validate + parse imported plays
│
└── server/                         # Backend (Node.js + Express)
    ├── index.js                    # Express app entry point
    ├── db/
    │   ├── schema.sql              # Full PostgreSQL schema (idempotent migrations)
    │   ├── pool.js                 # pg Pool instance
    │   └── migrate.js              # Run schema.sql against DB
    ├── lib/
    │   ├── email.js                # Resend email helpers
    │   └── userTeams.js            # getUserTeams, resolveActiveTeam, ensurePersonalWorkspace
    ├── middleware/
    │   └── auth.js                 # requireAuth, requireTeamRole, JWT helpers
    └── routes/
        ├── auth.js                 # Signup, login, logout, /me, password reset
        ├── onboarding.js           # First-run: create-team, join-team, solo
        ├── teams.js                # Team management + post-onboarding join/create/leave/switch
        ├── users.js                # Profile, preferences, email change
        ├── plays.js                # CRUD for plays and folders
        ├── verification.js         # Email verification codes
        └── admin.js                # Admin-only routes
```

---

## User Roles

Roles are **per team membership** — a user can be a coach on one team and a player on another.

| Role | Capabilities |
|---|---|
| `owner` | Full control, transfer ownership, delete team |
| `coach` | Create/edit/delete plays, manage roster, rotate invite codes |
| `assistant_coach` | Scoped by `team_settings` flags set by owner/coach |
| `player` | View non-hidden plays, receive notifications |

Personal workspaces (`is_personal = true`) give the user `owner` role with no other members.

---

## Multi-Team Support

Users can belong to multiple teams simultaneously:

- **Team Switcher** — clickable team name in sidebar; switch between teams, join new ones, create teams, or get a personal workspace
- **Active team** — persisted server-side via `users.active_team_id` (survives logout/login)
- **Post-onboarding flows** — any role can join additional teams, create new teams, or create a personal workspace from Settings or the TeamSwitcher
- **Leave team** — role-aware:
  - Players / coaches (non-owner): free to leave at any time; plays stay with the team
  - Owners with other members: must transfer ownership first
  - Sole owner: deletes the team and all its plays
  - If leaving results in no teams: a personal workspace is auto-created

---

## Onboarding

New users choose one of three paths after signup:

1. **Create Team** — become owner/coach of a new team
2. **Join Team** — enter a 6-character invite code; role is determined by the code (player code → player, coach code → coach)
3. **Just Make Plays** — personal workspace, no team required

The `users.onboarded_at` timestamp gates access to the app. Revisiting `/onboarding` when already onboarded redirects to `/app/plays`.

---

## Supported Sports

| Sport | Field | Ball |
|---|---|---|
| Rugby | Rugby field | Oblong ball (rotates toward movement) |
| Football | Football field | Oblong ball (rotates toward movement) |
| Soccer | Soccer field | Round ball |
| Lacrosse | Lacrosse field | Round ball |
| Women's Lacrosse | Women's Lacrosse field | Round ball |
| Basketball | Basketball court | Round ball |
| Field Hockey | Field Hockey field | Round ball |
| Ice Hockey | Ice Hockey rink | Black puck (rendered as circle) |
| Blank | No background | Round ball |

Sport is selected at play creation time and determines the field image, ball sprite, and ball-rotation behavior. Field Hockey and Ice Hockey were added in the latest release.

---

## Canvas & Animation

- **Canvas**: Konva.js via react-konva. Single `KonvaCanvasRoot` handles all rendering, pan/zoom, marquee selection, and snapping
- **Animation**: Immutable JSON tracks + RAF engine. Playback updates Konva nodes imperatively — no React re-renders per frame
- **Drawing tools**: freehand, arrows, shapes, text, erase; multi-select with group move/resize/rotate
- **Coordinate system**: `(0,0)` = field center, `+x` right, `+y` down, pixels. Field rotates visually but world coords stay axis-aligned
- **Snapping**: center-to-center, field center, canvas center; orange guideline dashes
- **Playback speed**: `play.playback.speedMultiplier` (0–100) scales preview playback rate from 0.25× to 4×
- **Controlled preview**: `PlayPreviewCard` accepts a `controlledTimeMs` prop to drive animation from an external source (e.g. a scrubber)

---

## Admin Plays Page

The admin plays page (`/admin/plays`) lets admins manage the full play library:

- **New play modal** — sport picker prompt before creating a new play; passes the selected sport as route state so the editor pre-loads the correct field
- **Sort options** — Custom Order, Recently Updated, Recently Created, Name A→Z / Z→A
- **Duplicate** — inserts the copy immediately after the original in the list (not at the end)
- **Sport tag cleanup** — on load, any sport-name tags that were previously auto-applied to plays are stripped automatically
- **Playbook section panel** — sport badges removed; only user-defined tags are shown

---

## Available Scripts

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run test         # Vitest
```

---

## Deployment

Deployed on **Railway**. Only redeploy after changes to `server/db/schema.sql` or backend routes.

The schema is idempotent — all migrations use `IF NOT EXISTS` or `DO $$ BEGIN ... EXCEPTION WHEN duplicate_column THEN NULL END $$` patterns and are safe to re-run.
