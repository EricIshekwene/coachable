# Routes

## Public

| Route | Page | Description |
|---|---|---|
| `/` | `SlateRoot` (App.jsx) | Slate play editor (current app) |
| `/signup` | `pages/Signup.jsx` | Create account → onboarding or login |
| `/login` | `pages/Login.jsx` | Log in → onboarding (no team) or /app/plays (onboarded) |
| `/onboarding` | `pages/Onboarding.jsx` | Team setup → /app/plays |

## App (authenticated)

| Route | Page | Description |
|---|---|---|
| `/app/plays` | `pages/app/Plays.jsx` | Playbook list |
| `/app/plays/new` | `pages/app/PlayNew.jsx` | Create new play (coach only) — Slate editor |
| `/app/plays/:playId` | `pages/app/PlayView.jsx` | View a play |
| `/app/plays/:playId/edit` | `pages/app/PlayEdit.jsx` | Edit a play (coach only) — Slate editor |
| `/app/team` | `pages/app/Team.jsx` | Team management |
| `/app/profile` | `pages/app/Profile.jsx` | Account settings, logout |

## Flow

```
/  (landing/slate)
├── /signup → /onboarding → /app/plays
├── /login → /onboarding (no team) or /app/plays (onboarded)

/app/plays
├── /app/plays/new (coach) → /app/plays/:playId/edit → /app/plays/:playId
├── /app/plays/:playId → /app/plays/:playId/edit (coach)
├── /app/team
└── /app/profile → / (logout)
```
