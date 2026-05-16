# Crawler Map

A lookup table for finding code by feature or by file. Use this when the user says "edit the X" / "where does Y live" — start with the **Feature Map**, fall back to the **File Tree**.

> Maintenance: if you rename, move, or delete a file/feature, update this map in the same change. Stale entries here are worse than no map.

---

## Feature Map (what the user says → where to look)

### Play editor / canvas
| User says... | Primary file(s) | Notes |
|---|---|---|
| "the slate", "play editor", "top-level wiring" | [src/features/slate/Slate.jsx](src/features/slate/Slate.jsx) | Feature root — owns entities, history, viewport, animation, import/export glue |
| "drawing-mode slate" (admin sandbox) | [src/features/slate/SlateDrawing.jsx](src/features/slate/SlateDrawing.jsx) | Mounted at `/admin/drawing` |
| "record-mode slate" | [src/features/slate/SlateRecord.jsx](src/features/slate/SlateRecord.jsx) | Mounted at `/admin/record` |
| "the canvas", "Konva root", "the stage" | [src/canvas/KonvaCanvasRoot.jsx](src/canvas/KonvaCanvasRoot.jsx) | Stage, field image, item rendering, drag/pan/zoom; exposes `animateFrame()` via ref |
| "field viewport", "BoardViewport" | [src/canvas/BoardViewport.jsx](src/canvas/BoardViewport.jsx) | Wrapper div/ref around the canvas |
| "pan / zoom / camera" | [src/features/slate/hooks/useFieldViewport.js](src/features/slate/hooks/useFieldViewport.js) | Camera `{x, y, zoom}`, fieldRotation |
| "snapping", "guidelines", "orange dashes" | [src/canvas/hooks/useCanvasSnapping.js](src/canvas/hooks/useCanvasSnapping.js) | Center-to-center, field/canvas center snapping math |
| "marquee select" | [src/canvas/hooks/useCanvasMarquee.js](src/canvas/hooks/useCanvasMarquee.js) | |
| "canvas pan" | [src/canvas/hooks/useCanvasPan.js](src/canvas/hooks/useCanvasPan.js) | |
| "canvas size", "ResizeObserver" | [src/canvas/hooks/useCanvasSize.js](src/canvas/hooks/useCanvasSize.js) | |
| "player popup", "action popup on a player" | [src/canvas/PlayerActionPopup.jsx](src/canvas/PlayerActionPopup.jsx) | |
| "multi-select popup" | [src/canvas/MultiSelectActionPopup.jsx](src/canvas/MultiSelectActionPopup.jsx) | |

### Drawings (pen / arrow / text / erase)
Drawings are split into two scopes: **annotation** (overlays) and **motion** (entity-attached paths). See [src/features/slate/DRAWING_SEPARATION.md](src/features/slate/DRAWING_SEPARATION.md) for the architecture, data model, and which scope owns what.
| User says... | Primary file(s) |
|---|---|
| "drawing tool", "pen tool", "draw mode" | [src/canvas/hooks/useCanvasDrawing.js](src/canvas/hooks/useCanvasDrawing.js) |
| "drawing geometry", "hit-test", "bounds", "resize math" | [src/canvas/drawingGeometry.js](src/canvas/drawingGeometry.js) |
| "drawing selection", "drag/resize/rotate drawings" | [src/canvas/hooks/useDrawingSelection.js](src/canvas/hooks/useDrawingSelection.js) |
| "drawings state in slate" (per-scope hook) | [src/features/slate/hooks/useDrawings.js](src/features/slate/hooks/useDrawings.js) |
| "annotation/motion split", "drawing schema", "v2 → v3 migration" | [src/features/slate/utils/drawingSchema.js](src/features/slate/utils/drawingSchema.js) |
| "annotation visibility window math" | [src/features/slate/utils/drawingTiming.js](src/features/slate/utils/drawingTiming.js) |
| "drawing scope config", "what a scope is allowed to do" | [src/canvas/drawingScopeConfig.js](src/canvas/drawingScopeConfig.js) |
| "draw tools pill" (annotation palette) | [src/components/DrawToolsPill.jsx](src/components/DrawToolsPill.jsx) |
| "animation drawing tools" (motion palette) | [src/components/AnimationDrawingTools.jsx](src/components/AnimationDrawingTools.jsx) |
| "floating tool pill shell" (shared palette container) | [src/components/toolPills/FloatingToolPillShell.jsx](src/components/toolPills/FloatingToolPillShell.jsx) |
| "flip / reflect drawings" | [src/components/rightPanel/ReflectPlaySection.jsx](src/components/rightPanel/ReflectPlaySection.jsx) |
| "drawing style" (color/width) | [src/components/rightPanel/DrawingStyleSection.jsx](src/components/rightPanel/DrawingStyleSection.jsx) |
| "drawing objects list" | [src/components/rightPanel/DrawingObjectsList.jsx](src/components/rightPanel/DrawingObjectsList.jsx) |

### Animation / playback
| User says... | Primary file(s) |
|---|---|
| "animation engine", "playback engine" | [src/animation/engine.js](src/animation/engine.js) |
| "animation schema", "tracks data model" | [src/animation/schema.js](src/animation/schema.js) |
| "interpolation", "tween between keyframes" | [src/animation/interpolate.js](src/animation/interpolate.js) |
| "serialize animation" | [src/animation/serialize.js](src/animation/serialize.js) |
| "animation index / exports" | [src/animation/index.js](src/animation/index.js) |
| "smooth track" | [src/utils/smoothTrack.js](src/utils/smoothTrack.js) |

### Keyframes / timeline
| User says... | Primary file(s) |
|---|---|
| "control pill", "the bottom bar" | [src/components/controlPill/ControlPill.jsx](src/components/controlPill/ControlPill.jsx) |
| "timeline", "time bar" | [src/components/controlPill/TimeBar.jsx](src/components/controlPill/TimeBar.jsx) |
| "keyframe display", "the keyframe dots" | [src/components/controlPill/KeyframeDisplay.jsx](src/components/controlPill/KeyframeDisplay.jsx) |
| "keyframe manager" | [src/components/controlPill/KeyframeManager.jsx](src/components/controlPill/KeyframeManager.jsx) |
| "playback controls" (play/pause) | [src/components/controlPill/PlaybackControls.jsx](src/components/controlPill/PlaybackControls.jsx) |
| "speed slider" | [src/components/controlPill/SpeedSlider.jsx](src/components/controlPill/SpeedSlider.jsx) |
| "time pill" (current time chip) | [src/components/controlPill/TimePill.jsx](src/components/controlPill/TimePill.jsx) |
| "step track" (motion steps) | [src/components/controlPill/StepTrack.jsx](src/components/controlPill/StepTrack.jsx) |
| "annotation visibility track" (timeline window for annotations) | [src/components/controlPill/AnnotationVisibilityTrack.jsx](src/components/controlPill/AnnotationVisibilityTrack.jsx) |
| "control pill dropdown" | [src/components/controlPill/DropdownMenu.jsx](src/components/controlPill/DropdownMenu.jsx) |
| "control pill debug overlay" | [src/components/controlPill/DebugOverlay.jsx](src/components/controlPill/DebugOverlay.jsx) |

### Sidebars / panels
| User says... | Primary file(s) |
|---|---|
| "left sidebar", "wide sidebar" | [src/components/WideSidebar.jsx](src/components/WideSidebar.jsx) → [src/components/wideSidebar/WideSidebarRoot.jsx](src/components/wideSidebar/WideSidebarRoot.jsx) |
| "sidebar sections" | [src/components/sidebar/SidebarRoot.jsx](src/components/sidebar/SidebarRoot.jsx) |
| "add player section" | [src/components/sidebar/AddPlayerSection.jsx](src/components/sidebar/AddPlayerSection.jsx) |
| "select tool section" | [src/components/sidebar/SelectToolSection.jsx](src/components/sidebar/SelectToolSection.jsx) |
| "pen tool section" | [src/components/sidebar/PenToolSection.jsx](src/components/sidebar/PenToolSection.jsx) |
| "eraser tool section" | [src/components/sidebar/EraserToolSection.jsx](src/components/sidebar/EraserToolSection.jsx) |
| "player color section" | [src/components/sidebar/PlayerColorSection.jsx](src/components/sidebar/PlayerColorSection.jsx) |
| "presets section" (left) | [src/components/sidebar/PresetSection.jsx](src/components/sidebar/PresetSection.jsx) |
| "prefabs section" (left) | [src/components/sidebar/PrefabsSection.jsx](src/components/sidebar/PrefabsSection.jsx) |
| "history actions" (undo/redo buttons) | [src/components/sidebar/HistoryActionsSection.jsx](src/components/sidebar/HistoryActionsSection.jsx) |
| "right panel" | [src/components/RightPanel.jsx](src/components/RightPanel.jsx) |
| "all players list" (right panel) | [src/components/rightPanel/AllPlayersSection.jsx](src/components/rightPanel/AllPlayersSection.jsx) |
| "selected players" (right panel) | [src/components/rightPanel/SelectedPlayersSection.jsx](src/components/rightPanel/SelectedPlayersSection.jsx) |
| "objects list" (right panel) | [src/components/rightPanel/ObjectsSection.jsx](src/components/rightPanel/ObjectsSection.jsx) |
| "players section" (generic, right) | [src/components/rightPanel/PlayersSection.jsx](src/components/rightPanel/PlayersSection.jsx) |
| "player row" | [src/components/rightPanel/PlayerRow.jsx](src/components/rightPanel/PlayerRow.jsx) |
| "player edit panel" | [src/components/rightPanel/PlayerEditPanel.jsx](src/components/rightPanel/PlayerEditPanel.jsx) |
| "player transform" (rotate/scale) | [src/components/rightPanel/PlayerTransformSection.jsx](src/components/rightPanel/PlayerTransformSection.jsx) |
| "field settings" (right panel) | [src/components/rightPanel/FieldSettingsSection.jsx](src/components/rightPanel/FieldSettingsSection.jsx) |
| "play name editor" | [src/components/rightPanel/PlayNameEditor.jsx](src/components/rightPanel/PlayNameEditor.jsx) |
| "export actions" (right panel) | [src/components/rightPanel/ExportActions.jsx](src/components/rightPanel/ExportActions.jsx) |
| "save prefab button" | [src/components/rightPanel/SavePrefabButton.jsx](src/components/rightPanel/SavePrefabButton.jsx) |
| "advanced settings button" | [src/components/rightPanel/AdvancedSettingsButton.jsx](src/components/rightPanel/AdvancedSettingsButton.jsx) |
| "recording mode toggle" (right panel) | [src/components/rightPanel/RecordingModeToggle.jsx](src/components/rightPanel/RecordingModeToggle.jsx) |
| "recording player list" (right panel) | [src/components/rightPanel/RecordingPlayerList.jsx](src/components/rightPanel/RecordingPlayerList.jsx) |
| "debug panel" (right panel) | [src/components/rightPanel/DebugPanel.jsx](src/components/rightPanel/DebugPanel.jsx) |
| "mobile editor bar" | [src/components/MobileEditorBar.jsx](src/components/MobileEditorBar.jsx) |
| "view-only controls" | [src/components/ViewOnlyControls.jsx](src/components/ViewOnlyControls.jsx) |

### Modals / popovers
| User says... | Primary file(s) |
|---|---|
| "advanced settings modal" | [src/components/AdvancedSettings.jsx](src/components/AdvancedSettings.jsx) + [src/components/advancedSettings/](src/components/advancedSettings/) |
| "animation settings" (in modal) | [src/components/advancedSettings/AnimationSettingsSection.jsx](src/components/advancedSettings/AnimationSettingsSection.jsx) |
| "player settings" (in modal) | [src/components/advancedSettings/PlayerSettingsSection.jsx](src/components/advancedSettings/PlayerSettingsSection.jsx) |
| "ball settings" (in modal) | [src/components/advancedSettings/BallSettingsSection.jsx](src/components/advancedSettings/BallSettingsSection.jsx) |
| "pitch settings" (in modal) | [src/components/advancedSettings/PitchSettingsSection.jsx](src/components/advancedSettings/PitchSettingsSection.jsx) |
| "logger settings" (in modal) | [src/components/advancedSettings/LoggerSettingsSection.jsx](src/components/advancedSettings/LoggerSettingsSection.jsx) |
| "export video settings" (in modal) | [src/components/advancedSettings/ExportVideoSettingsSection.jsx](src/components/advancedSettings/ExportVideoSettingsSection.jsx) |
| "record debug panel" (in modal) | [src/components/advancedSettings/RecordDebugPanel.jsx](src/components/advancedSettings/RecordDebugPanel.jsx) |
| "export modal" | [src/components/ExportModal.jsx](src/components/ExportModal.jsx) |
| "export overlay" (progress) | [src/components/ExportOverlay.jsx](src/components/ExportOverlay.jsx) |
| "save prefab modal" | [src/components/SavePrefabModal.jsx](src/components/SavePrefabModal.jsx) |
| "save to playbook modal" | [src/components/SaveToPlaybookModal.jsx](src/components/SaveToPlaybookModal.jsx) |
| "auth prompt modal" | [src/components/AuthPromptModal.jsx](src/components/AuthPromptModal.jsx) |
| "confirm modal" | [src/components/subcomponents/ConfirmModal.jsx](src/components/subcomponents/ConfirmModal.jsx) |
| "color picker popover" | [src/components/subcomponents/ColorPickerPopover.jsx](src/components/subcomponents/ColorPickerPopover.jsx) |
| "prefabs popover" | [src/components/subcomponents/PrefabsPopover.jsx](src/components/subcomponents/PrefabsPopover.jsx) |
| "generic popovers" | [src/components/subcomponents/Popovers.jsx](src/components/subcomponents/Popovers.jsx) |
| "screenshot confirm bar" | [src/components/ScreenshotConfirmBar.jsx](src/components/ScreenshotConfirmBar.jsx) |
| "message popup", "toast / notifications" | [src/components/MessagePopup/MessagePopup.jsx](src/components/MessagePopup/MessagePopup.jsx) + [src/components/messaging/useMessagePopup.js](src/components/messaging/useMessagePopup.js) |
| "mobile view-only gate" | [src/components/MobileViewOnlyGate.jsx](src/components/MobileViewOnlyGate.jsx) |

### Recording mode
| User says... | Primary file(s) |
|---|---|
| "recording state / hook" | [src/features/slate/hooks/useRecordingMode.js](src/features/slate/hooks/useRecordingMode.js) |
| "recording control bar" (replaces ControlPill) | [src/components/RecordingControlBar.jsx](src/components/RecordingControlBar.jsx) |
| "recording countdown" | [src/components/RecordingCountdown.jsx](src/components/RecordingCountdown.jsx) |
| "recording timeline pill" | [src/components/RecordingTimelinePill.jsx](src/components/RecordingTimelinePill.jsx) |

### Slate state hubs (in `src/features/slate/hooks/`)
| User says... | Primary file(s) |
|---|---|
| "players, ball, selection, drag" | [hooks/useSlateEntities.js](src/features/slate/hooks/useSlateEntities.js) |
| "undo / redo", "history" | [hooks/useSlateHistory.js](src/features/slate/hooks/useSlateHistory.js) |
| "advanced settings state / log events" | [hooks/useAdvancedSettings.js](src/features/slate/hooks/useAdvancedSettings.js) |
| "action log" | [hooks/useSlateActionLog.js](src/features/slate/hooks/useSlateActionLog.js) |

### Import / export / persistence
| User says... | Primary file(s) |
|---|---|
| "export play to JSON", "download play" | [src/utils/exportPlay.js](src/utils/exportPlay.js) |
| "import play" | [src/utils/importPlay.js](src/utils/importPlay.js) |
| "video export" | [src/utils/videoEncoder.js](src/utils/videoEncoder.js) |
| "save play to server" (API client) | [src/utils/apiPlays.js](src/utils/apiPlays.js) |
| "folders API client" | [src/utils/apiFolders.js](src/utils/apiFolders.js) |
| "prefabs API client" | [src/utils/prefabsApi.js](src/utils/prefabsApi.js) |
| "playbook sections API client" | [src/utils/playbookSectionsApi.js](src/utils/playbookSectionsApi.js) |
| "generic API helper / fetch" | [src/utils/api.js](src/utils/api.js) |
| "local autosave for plays" | [src/utils/appPlaysStorage.js](src/utils/appPlaysStorage.js) |
| "playbook localStorage" | [src/utils/playbookStorage.js](src/utils/playbookStorage.js) |
| "custom prefabs (local)" | [src/utils/customPrefabs.js](src/utils/customPrefabs.js) |
| "data contracts / shape validation" | [src/utils/dataContracts.js](src/utils/dataContracts.js) |
| "input validation" | [src/utils/inputValidation.js](src/utils/inputValidation.js) |

### Auth / context / routing
| User says... | Primary file(s) |
|---|---|
| "auth context", "current user", "login state" | [src/context/AuthContext.jsx](src/context/AuthContext.jsx) |
| "app-wide messages" | [src/context/AppMessageContext.jsx](src/context/AppMessageContext.jsx) |
| "routes", "router", "all pages" | [src/App.jsx](src/App.jsx) |
| "app shell layout" (nav chrome) | [src/layouts/AppLayout.jsx](src/layouts/AppLayout.jsx) |
| "admin elevation / session" | [src/utils/adminElevation.js](src/utils/adminElevation.js) |
| "error reporter" | [src/utils/errorReporter.js](src/utils/errorReporter.js) |
| "mobile viewport fixes" | [src/utils/mobileViewport.js](src/utils/mobileViewport.js) |
| "theme color hook" | [src/utils/useThemeColor.js](src/utils/useThemeColor.js) |

### Play preview cards (used in playbooks/folders/grid)
| User says... | Primary file(s) |
|---|---|
| "play preview card" | [src/components/PlayPreviewCard.jsx](src/components/PlayPreviewCard.jsx) |
| "play preview player" (auto-play thumbnail) | [src/components/PlayPreviewPlayer.jsx](src/components/PlayPreviewPlayer.jsx) |
| "team switcher" | [src/components/TeamSwitcher.jsx](src/components/TeamSwitcher.jsx) |
| "sport-aware public nav" | [src/components/SportAwarePublicNav.jsx](src/components/SportAwarePublicNav.jsx) |

### Debug loggers (toggled in advanced-settings logger section)
All under [src/animation/](src/animation/), [src/canvas/](src/canvas/), [src/features/slate/](src/features/slate/), [src/utils/](src/utils/):
- `debugLogger.js` (animation), `keyframeMoveDebugLogger.js` (animation)
- `drawDebugLogger.js`, `keyboardToolDebugLogger.js` (canvas)
- `placeBallDebugLogger.js`, `recordingDebugLogger.js`, `rotationDebugLogger.js`, `prefabDebugLogger.js` (slate)
- `videoExportDebugLogger.js`, `playPersistenceDebugLogger.js` (utils)

---

## Pages (`src/pages/`)

### Public / marketing
| Path | File |
|---|---|
| `/`, `/home`, `/rugby`, `/football`, etc. | [Landing.jsx](src/pages/Landing.jsx) |
| `/rugby/playbooks`, etc. | [PublicPlaybooksPage.jsx](src/pages/PublicPlaybooksPage.jsx) |
| `/resources` | [Resources.jsx](src/pages/Resources.jsx) |
| `/enterprise` | [Enterprise.jsx](src/pages/Enterprise.jsx) |
| `/signup` | [Signup.jsx](src/pages/Signup.jsx) |
| `/login` | [Login.jsx](src/pages/Login.jsx) |
| `/forgot-password` | [ForgotPassword.jsx](src/pages/ForgotPassword.jsx) |
| `/reset-password` | [ResetPassword.jsx](src/pages/ResetPassword.jsx) |
| `/onboarding` | [Onboarding.jsx](src/pages/Onboarding.jsx) |
| `/verify-email` | [VerifyEmail.jsx](src/pages/VerifyEmail.jsx) |
| `/no-team` | [NoTeam.jsx](src/pages/NoTeam.jsx) |
| `/slate`, `/slate/:sport` | [SportPickerPage.jsx](src/pages/SportPickerPage.jsx) (picker) → SlateRoot wrapper in App.jsx |
| `*` (404) | [NotFound.jsx](src/pages/NotFound.jsx) |

### Sharing
| Path | File |
|---|---|
| `/shared/:token` | [SharedPlay.jsx](src/pages/SharedPlay.jsx) |
| `/shared/:token/view` | [SharedPlayView.jsx](src/pages/SharedPlayView.jsx) |
| `/shared/folder/:token` | [SharedFolder.jsx](src/pages/SharedFolder.jsx) |
| `/platform-play/:playId` | [PlatformPlayView.jsx](src/pages/PlatformPlayView.jsx) |

### App shell (`/app/*`, behind auth+onboarded)
| Path | File |
|---|---|
| `/app/plays` | [pages/app/Plays.jsx](src/pages/app/Plays.jsx) |
| `/app/plays/new` | [pages/app/PlayNew.jsx](src/pages/app/PlayNew.jsx) |
| `/app/plays/:playId` | [pages/app/PlayView.jsx](src/pages/app/PlayView.jsx) |
| `/app/plays/:playId/edit` (full-screen, no chrome) | [PlayEditPage.jsx](src/pages/PlayEditPage.jsx) |
| `/app/plays/:playId/view` (full-screen) | [PlayViewOnlyPage.jsx](src/pages/PlayViewOnlyPage.jsx) |
| `/app/team` | [pages/app/Team.jsx](src/pages/app/Team.jsx) |
| `/app/profile` | [pages/app/Profile.jsx](src/pages/app/Profile.jsx) |
| `/app/profile/verify-email` | [pages/app/ProfileEmailVerification.jsx](src/pages/app/ProfileEmailVerification.jsx) |
| `/app/settings` | [pages/app/Settings.jsx](src/pages/app/Settings.jsx) |
| `/app/report-issue` | [pages/app/ReportIssue.jsx](src/pages/app/ReportIssue.jsx) |
| `/app/playbooks` (+`/:sectionId`) | [pages/app/Playbooks.jsx](src/pages/app/Playbooks.jsx) |
| `/app/videos` | [pages/app/DemoVideos.jsx](src/pages/app/DemoVideos.jsx) |

### Admin (`/admin/*`)
| Path | File |
|---|---|
| `/admin` (login) | [Admin.jsx](src/pages/Admin.jsx) |
| `/admin/tests` | [AdminTests.jsx](src/pages/AdminTests.jsx) |
| `/admin/errors` | [AdminErrors.jsx](src/pages/AdminErrors.jsx) |
| `/admin/slate` | SlateRoot (in App.jsx) → [features/slate/Slate.jsx](src/features/slate/Slate.jsx) |
| `/admin/record` | SlateRecordRoot → [features/slate/SlateRecord.jsx](src/features/slate/SlateRecord.jsx) |
| `/admin/drawing` | SlateDrawingRoot → [features/slate/SlateDrawing.jsx](src/features/slate/SlateDrawing.jsx) |
| `/admin/app` | [AdminPlaysPage.jsx](src/pages/AdminPlaysPage.jsx) |
| `/admin/plays/:playId/edit` | [AdminPlayEditPage.jsx](src/pages/AdminPlayEditPage.jsx) |
| `/admin/presets/:sport` | [AdminSportPresetsPage.jsx](src/pages/AdminSportPresetsPage.jsx) |
| `/admin/presets/:sport/:presetId/edit` | [AdminPresetEditPage.jsx](src/pages/AdminPresetEditPage.jsx) |
| `/admin/users/:userId` | [AdminUserActivity.jsx](src/pages/AdminUserActivity.jsx) |
| `/admin/user-issues` | [AdminUserIssues.jsx](src/pages/AdminUserIssues.jsx) |
| `/admin/mobile-view` | [AdminMobileView.jsx](src/pages/AdminMobileView.jsx) |
| `/admin/test` | [AdminTestSlate.jsx](src/pages/AdminTestSlate.jsx) |
| `/admin/demo-videos` | [AdminDemoVideos.jsx](src/pages/AdminDemoVideos.jsx) |
| `/admin/one-page` | [AdminOnePage.jsx](src/pages/AdminOnePage.jsx) |

---

## Admin shared UI (`src/admin/`)
- [adminNav.js](src/admin/adminNav.js) — admin nav config
- [AdminContext.jsx](src/admin/AdminContext.jsx) — theme + admin session context
- **components/**: AdminShell, AdminPage, AdminSection, AdminHeader, AdminNav, AdminSidebar, AdminCard, AdminBtn, AdminInput, AdminSelect, AdminCheckbox, AdminBadge, AdminEmptyState, AdminSpinner, AdminModal — see [src/admin/components/](src/admin/components/)
- **analytics/**: AnalyticsDashboard + KpiStrip, KpiCard, ActivityFeed, UserGrowthChart, SportMixChart, PlayActivityChart, OnboardingFunnel, useDashboardAnalytics — see [src/admin/analytics/](src/admin/analytics/)

---

## Server (`server/`)

### Entrypoint
- [index.js](server/index.js) — Express app, CORS, route mounting, static `dist/` serving, auto-migrate, cleanup intervals
- [Procfile](server/Procfile) — Railway start command
- [reset-password.js](server/reset-password.js) — standalone reset-password script

### Routes (mounted in `index.js`)
| Mount | File |
|---|---|
| `/auth` | [routes/auth.js](server/routes/auth.js) |
| `/onboarding` | [routes/onboarding.js](server/routes/onboarding.js) |
| `/teams`, `/teams/*/plays`, `/teams/*/folders` | [routes/teams.js](server/routes/teams.js), [routes/plays.js](server/routes/plays.js), [routes/folders.js](server/routes/folders.js) |
| `/users` | [routes/users.js](server/routes/users.js) |
| `/verification` | [routes/verification.js](server/routes/verification.js) |
| `/admin` | [routes/admin.js](server/routes/admin.js) (also exports `cleanupStaleAccounts`, `cleanupDeletedTeams`) |
| `/shared` | [routes/shared.js](server/routes/shared.js) |
| `/error-reports` | [routes/errorReports.js](server/routes/errorReports.js) |
| `/platform-plays` | [routes/platformPlays.js](server/routes/platformPlays.js) |
| `/page-sections` | [routes/pageSections.js](server/routes/pageSections.js) |
| `/user-issues` | [routes/userIssues.js](server/routes/userIssues.js) |
| `/playbook-sections` | [routes/playbookSections.js](server/routes/playbookSections.js) |
| `/demo-videos` | [routes/demoVideos.js](server/routes/demoVideos.js) |
| `/prefabs` | [routes/prefabs.js](server/routes/prefabs.js) |
| `/sport-presets` | [routes/sportPresets.js](server/routes/sportPresets.js) |

### Middleware / lib / utils / config
- [middleware/auth.js](server/middleware/auth.js) — JWT/session middleware
- [lib/email.js](server/lib/email.js) — Resend email helpers
- [lib/userTeams.js](server/lib/userTeams.js) — user↔team queries
- [utils/syncSports.js](server/utils/syncSports.js) — startup sport seed
- [utils/syncPlaybookDefaults.js](server/utils/syncPlaybookDefaults.js) — startup playbook seed
- [config/sports.js](server/config/sports.js) — sport definitions / field configs
- [scripts/compare-dbs.js](server/scripts/compare-dbs.js) — diff Postgres DBs

### Database
- [db/schema.sql](server/db/schema.sql) — full schema (idempotent, auto-run on boot)
- [db/migrate.js](server/db/migrate.js) — standalone migration runner
- [db/pool.js](server/db/pool.js) — `pg` Pool export

**Tables** (from schema.sql): `users`, `email_verification_codes`, `user_preferences`, `teams`, `team_settings`, `team_memberships`, `team_invite_codes`, `team_invites`, `team_join_requests`, `play_folders`, `plays`, `play_tags`, `play_tag_links`, `play_favorites`, `play_share_links`, `folder_share_links`, `error_reports`, `password_reset_codes`, `platform_play_folders`, `platform_plays`, `page_sections`, `user_issues`, `playbook_sections`, `playbook_section_plays`, `demo_videos`, `user_prefabs`, `admin_prefabs`, `sport_presets`.

---

## Tests (`admin/test/`)
All run via Vitest. One file per feature; create new ones here when adding tests.

- Auth/account: `forgotPassword.test.js`, `accountDeletedEmail.test.js`, `onboarding.test.js`
- Admin shell: `adminBtn.test.js`, `adminModal.test.js`, `adminNav.test.js`, `adminShell.test.js`, `adminDangerMode.test.js`, `analyticsDashboard.test.js`, `usersHideFilters.test.js`
- Plays/folders/playbooks: `localStorageAutosave.test.js`, `platformPlays.test.js`, `playbookFolderBrowse.test.js`, `playbookSections.test.js`, `landingPlaybooksNav.test.js`, `playPreviewCardCones.test.js`, `playPreviewPlayer.test.js`, `playCopyAnalytics.test.js`, `sportPresets.test.js`, `presetBallCycle.test.js`, `hideFromPlayers.test.js`, `sportNavContext.test.js`, `syncSports.test.js`
- Drawing/keyframe: `keyframeStyling.test.js`, `drawingModePreviewAnimation.test.js`, `drawingFlipReflect.test.js`, `drawingModeUndoRedo.test.js`, `drawingScopeSeparation.test.js`, `annotationDrawingVisibility.test.js`, `drawingExportV3Migration.test.js`
- Misc: `videoEncoder.test.js`, `errorReporter.test.js`, `demoVideos.test.js`

In-source unit suite for canvas geometry: [src/canvas/__tests__/drawingGeometry.test.js](src/canvas/__tests__/drawingGeometry.test.js).
Suites used by the admin test runner: [src/testing/suites/](src/testing/suites/) (animationSchema, drawingGeometry, importExport, interpolate) and [src/testing/testRunner.js](src/testing/testRunner.js).

---

## Top-level / misc
- [src/App.jsx](src/App.jsx) — router + auth gates + slate wrappers
- [src/main.jsx](src/main.jsx) — React entrypoint
- [src/index.css](src/index.css) — global styles / Tailwind
- [index.html](index.html) — Vite HTML entry
- [vite.config.js](vite.config.js) — Vite config
- [eslint.config.js](eslint.config.js) — ESLint
- [public/](public/) — static assets
- [scripts/seed-account.mjs](scripts/seed-account.mjs) — seed a dev account
- [.railwayignore](.railwayignore) — required for deploys (excludes frontend tree)
- [docs/](docs/) — `PLATFORM_PLAYS.md`, `backend-flows-and-required-tables.md`

---

## Feature docs (read these when touching the feature)
- [src/features/slate/README.md](src/features/slate/README.md) — slate architecture overview
- [src/features/slate/DRAWING_SEPARATION.md](src/features/slate/DRAWING_SEPARATION.md) — annotation/motion drawing split (read before touching drawings, palettes, eraser scope, or the v3 import/export pipeline)
- [src/features/slate/DRAWING_MODE_UNDO_REDO.md](src/features/slate/DRAWING_MODE_UNDO_REDO.md)
- [src/features/slate/KEYFRAME_HIGHLIGHT_EDIT_FIX.md](src/features/slate/KEYFRAME_HIGHLIGHT_EDIT_FIX.md)
- [src/features/slate/LOCALSTORAGE_AUTOSAVE.md](src/features/slate/LOCALSTORAGE_AUTOSAVE.md)
- [src/canvas/canvas.md](src/canvas/canvas.md), [src/canvas/object-snapping.md](src/canvas/object-snapping.md)
- [src/components/PLAY_PREVIEW_DRAWING_MODE.md](src/components/PLAY_PREVIEW_DRAWING_MODE.md), [src/components/PLAY_PREVIEW_PLAYER.md](src/components/PLAY_PREVIEW_PLAYER.md)
- [server/routes/DEMO_VIDEOS.md](server/routes/DEMO_VIDEOS.md), [server/routes/FORGOT_PASSWORD.md](server/routes/FORGOT_PASSWORD.md), [server/routes/PLAY_COPY_ANALYTICS_FIX.md](server/routes/PLAY_COPY_ANALYTICS_FIX.md)
- [server/PLAYBOOK_SECTIONS.md](server/PLAYBOOK_SECTIONS.md), [server/ONBOARDING_SEED_PLAY.md](server/ONBOARDING_SEED_PLAY.md), [server/lib/ACCOUNT_DELETED_EMAIL.md](server/lib/ACCOUNT_DELETED_EMAIL.md)
