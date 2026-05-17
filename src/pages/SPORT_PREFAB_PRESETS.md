# Sport Prefab Presets

Admin-curated reusable player groupings that surface in the Slate Prefabs panel for every user of a given sport. This is **not** another full-play preset system — it's a focused parallel to `sport_presets` that reuses the existing prefab placement contract.

## Why a separate feature from `sport_presets`?

| | `sport_presets` | `sport_prefab_presets` (this) |
|---|---|---|
| **What it stores** | A full starting canvas (players + ball + field settings + animation) | A small reusable group: relative-offset players + optional ball |
| **Where it surfaces** | "Create New Play" preset picker — sets the entire canvas on creation | Slate **Prefabs panel** — placed at a click point inside an existing play |
| **Data column** | `play_data JSONB` | `prefab_data JSONB` |
| **Scoped to** | A single play, used once | Reused many times across many plays |

The cleanest version of this feature was a published-prefab library, not a third play-editor model. We deliberately reuse the existing prefab payload (`{ players: [{dx, dy, number, name, color}], ball?: {dx, dy} }`) so the existing `handleCanvasPlacePrefab` in [Slate.jsx](../features/slate/Slate.jsx) places these without any new logic.

## Data model

`server/db/schema.sql` adds the `sport_prefab_presets` table:

```sql
CREATE TABLE sport_prefab_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'Prefab',
  prefab_data JSONB NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_hidden   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexed on `sport`. `is_hidden` defaults to true so newly created presets are drafts until published.

`prefab_data` shape:

```json
{
  "players": [{ "dx": -20, "dy": 0, "number": 10, "name": "", "color": "#ef4444" }],
  "ball": { "dx": 0, "dy": 0 }
}
```

`assignment` is **not** wired in v1. Inspection of the place/render flow showed it isn't used end-to-end today; adding it here would silently no-op.

## Backend

- **Admin CRUD:** `server/routes/admin.js` mounts `/admin/sport-prefab-presets[/...]` parallel to `/admin/sport-presets`. Same auth pattern (`requireAdminOrStaff` + `requirePerm("presets.edit"|"presets.create")` + `requireSportScope("presets.sportScope")`). DELETE requires `requireElevated` (Danger Mode).
- **App-facing fetch:** [`server/routes/sportPrefabPresets.js`](../../server/routes/sportPrefabPresets.js) mounted at `/sport-prefab-presets`, exposes `GET /:sport`. Requires auth, returns only `is_hidden = false` rows ordered by `sort_order ASC, created_at ASC`.

## Admin UI

- **List/grid:** [`AdminSportPrefabPresetsPage`](AdminSportPrefabPresetsPage.jsx) at `/admin/prefab-presets/:sport`. Mirrors the sport-preset list page: preview card via `PlayPreviewCard`, duplicate, publish/hide toggle, drag-reorder, delete with Danger Mode.
- **Editor:** [`AdminPrefabPresetEditPage`](AdminPrefabPresetEditPage.jsx) at `/admin/prefab-presets/:sport/:prefabPresetId/edit`. Wraps the full Slate editor with **autosave on every field change** — no Save button. Whatever is on the canvas (every represented player + the first ball if present) IS the prefab; placing/moving/deleting anything triggers a debounced write. Existing presets are reconstructed back onto the canvas on open so the admin can tweak and re-save. A small status pill shows "Editing / Saving… / Saved / Save failed".
- **Overview tab:** A "Prefab Presets" tab on [`AdminPlaysPage`](AdminPlaysPage.jsx) lists sport cards with counts, mirroring the existing Sport Presets tab.

Staff admin tree mirrors all of the above at `/staff/prefab-presets/...`.

## Slate integration

[Slate.jsx](../features/slate/Slate.jsx):

1. Fetches `publishedPrefabs` via `fetchSportPrefabPresets(sport)` whenever `sportProp` or `currentFieldType` changes.
2. Passes both `customPrefabs` and `publishedPrefabs` to `WideSidebar` and `MobileEditorBar`.
3. Accepts an admin-only `onPrefabPresetChange(payload, name)` callback — fires whenever the current selection produces a valid prefab payload. Used by `AdminPrefabPresetEditPage` to enable Save and capture the payload at save time. **Does not auto-save.**
4. Placement uses the existing `handleCanvasPlacePrefab` code path — no changes.

[WideSidebarRoot.jsx](../components/wideSidebar/WideSidebarRoot.jsx) merges both arrays into one list with source metadata (`isPublished`, `isCustom`, `readOnly`) preserved.

[PrefabsPopover.jsx](../components/subcomponents/PrefabsPopover.jsx) splits the list into two sections — "Published Presets" (with a Shared badge, no delete button) and "Your Prefabs" (deletable). [MobileEditorBar.jsx](../components/MobileEditorBar.jsx) does the same for mobile.

## Out of scope (v1)

- **SlateRecord:** Admin record-mode sandbox does not show published prefabs.
- **Folders / playbooks / new-play picker:** Prefab presets only live in the Slate Prefabs panel.
- **`assignment`:** Not stored in `prefab_data` payloads.
- **Per-user overrides:** Published presets are global per sport; users cannot favorite or hide them individually.

## Editor save flow

The editor uses a different contract from `AdminPresetEditPage`. The full-play preset editor reuses Slate's autosave (`onPlayDataChange`) — every keystroke writes a JSON play. The prefab-preset editor explicitly does not: the admin must click Save, and the saved payload comes from the **current selection**, not from the whole canvas. This is what makes the "place 30 players, select the 4-player pod you want" workflow possible without saving the whole field.

Save semantics:

- First save on `new` → `POST /admin/sport-prefab-presets/:sport`
- Subsequent saves → `PATCH /admin/sport-prefab-presets/:sport/:id`
- Empty selection → Save button disabled with hint text
- Edit load → reconstruct the saved prefab into Slate via `prefabToInitialPlayData`

## Files

### New
- `server/routes/sportPrefabPresets.js` — public GET route
- `src/pages/AdminSportPrefabPresetsPage.jsx` — list/grid page
- `src/pages/AdminPrefabPresetEditPage.jsx` — editor
- `src/utils/sportPrefabPresets.js` — transforms (`mapSportPrefabPresetToSidebarPrefab`, `prefabToPreviewPlayData`, `prefabToInitialPlayData`)
- `admin/test/sportPrefabPresets.test.js` — CRUD + transform tests

### Modified
- `server/db/schema.sql` — adds `sport_prefab_presets` table + index
- `server/index.js` — mounts `/sport-prefab-presets`
- `server/routes/admin.js` — adds admin CRUD routes parallel to sport presets
- `src/App.jsx` — adds `/admin/prefab-presets/...` and `/staff/prefab-presets/...` routes
- `src/pages/AdminPlaysPage.jsx` — adds "Prefab Presets" tab + sport cards
- `src/utils/prefabsApi.js` — adds `fetchSportPrefabPresets`
- `src/features/slate/Slate.jsx` — fetches published prefabs + emits selection payload via `onPrefabPresetChange`
- `src/components/WideSidebar.jsx` + `wideSidebar/WideSidebarRoot.jsx` — pass + merge `publishedPrefabs`
- `src/components/subcomponents/PrefabsPopover.jsx` — two sections + Shared badge
- `src/components/MobileEditorBar.jsx` — two sections in the prefab sheet
- `src/testing/suites/apiRoutes.suite.js` — admin CRUD + public fetch contract tests
