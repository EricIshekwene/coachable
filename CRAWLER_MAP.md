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
| "mobile touch gestures", "two-finger pan/pinch math" | [src/canvas/touchGestures.js](src/canvas/touchGestures.js) | Pure helpers (distance/midpoint/pinch-zoom/pan-delta) used by KonvaCanvasRoot's touch handler |
| "mobile editor", "mobile-view sandbox", "/admin/mobile-view" | [src/pages/AdminMobileView.jsx](src/pages/AdminMobileView.jsx) + [src/components/MobileEditorBar.jsx](src/features/slate/components/MobileEditorBar.jsx) | Touch-first Slate layout (admin-only). See [src/pages/MOBILE_EDITOR.md](src/pages/MOBILE_EDITOR.md) |
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
| "draw tools pill" (annotation palette) | [src/components/DrawToolsPill.jsx](src/features/slate/components/DrawToolsPill.jsx) |
| "animation drawing tools" (motion palette) | [src/components/AnimationDrawingTools.jsx](src/features/slate/components/AnimationDrawingTools.jsx) |
| "floating tool pill shell" (shared palette container) | [src/components/toolPills/FloatingToolPillShell.jsx](src/features/slate/components/toolPills/FloatingToolPillShell.jsx) |
| "flip / reflect drawings" | [src/components/rightPanel/ReflectPlaySection.jsx](src/features/slate/components/rightPanel/ReflectPlaySection.jsx) |
| "drawing style" (color/width) | [src/components/rightPanel/DrawingStyleSection.jsx](src/features/slate/components/rightPanel/DrawingStyleSection.jsx) |
| "drawing objects list" | [src/components/rightPanel/DrawingObjectsList.jsx](src/features/slate/components/rightPanel/DrawingObjectsList.jsx) |

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
| "control pill", "the bottom bar" | [src/features/slate/components/controlPill/ControlPill.jsx](src/features/slate/components/controlPill/ControlPill.jsx) |
| "timeline", "time bar" | [src/features/slate/components/controlPill/TimeBar.jsx](src/features/slate/components/controlPill/TimeBar.jsx) |
| "keyframe display", "the keyframe dots" | [src/features/slate/components/controlPill/KeyframeDisplay.jsx](src/features/slate/components/controlPill/KeyframeDisplay.jsx) |
| "keyframe manager" | [src/features/slate/components/controlPill/KeyframeManager.jsx](src/features/slate/components/controlPill/KeyframeManager.jsx) |
| "playback controls" (play/pause) | [src/features/slate/components/controlPill/PlaybackControls.jsx](src/features/slate/components/controlPill/PlaybackControls.jsx) |
| "speed slider" | [src/features/slate/components/controlPill/SpeedSlider.jsx](src/features/slate/components/controlPill/SpeedSlider.jsx) |
| "time pill" (current time chip) | [src/features/slate/components/controlPill/TimePill.jsx](src/features/slate/components/controlPill/TimePill.jsx) |
| "step track" (motion steps) | [src/features/slate/components/controlPill/StepTrack.jsx](src/features/slate/components/controlPill/StepTrack.jsx) |
| "annotation visibility track" (timeline window for annotations) | [src/features/slate/components/controlPill/AnnotationVisibilityTrack.jsx](src/features/slate/components/controlPill/AnnotationVisibilityTrack.jsx) |
| "track snapping", "timeline snap", "capcut/vn style snap" | [src/features/slate/components/controlPill/trackSnap.js](src/features/slate/components/controlPill/trackSnap.js) — pure helpers (see [TRACK_SNAPPING.md](src/features/slate/components/controlPill/trackSnap.js](src/features/slate/components/controlPill/trackSnap.js) — pure helpers (see [TRACK_SNAPPING.md) |
| "control pill dropdown" | [src/features/slate/components/controlPill/DropdownMenu.jsx](src/features/slate/components/controlPill/DropdownMenu.jsx) |
| "control pill debug overlay" | [src/features/slate/components/controlPill/DebugOverlay.jsx](src/features/slate/components/controlPill/DebugOverlay.jsx) |

### Sidebars / panels
| User says... | Primary file(s) |
|---|---|
| "left sidebar", "wide sidebar" | [src/components/WideSidebar.jsx](src/features/slate/components/WideSidebar.jsx) → [src/components/wideSidebar/WideSidebarRoot.jsx](src/features/slate/components/wideSidebar/WideSidebarRoot.jsx) |
| "sidebar sections" | [src/components/sidebar/SidebarRoot.jsx](src/features/slate/components/sidebar/SidebarRoot.jsx) |
| "add player section" | [src/components/sidebar/AddPlayerSection.jsx](src/features/slate/components/sidebar/AddPlayerSection.jsx) |
| "select tool section" | [src/components/sidebar/SelectToolSection.jsx](src/features/slate/components/sidebar/SelectToolSection.jsx) |
| "pen tool section" | [src/components/sidebar/PenToolSection.jsx](src/features/slate/components/sidebar/PenToolSection.jsx) |
| "eraser tool section" | [src/components/sidebar/EraserToolSection.jsx](src/features/slate/components/sidebar/EraserToolSection.jsx) |
| "player color section" | [src/components/sidebar/PlayerColorSection.jsx](src/features/slate/components/sidebar/PlayerColorSection.jsx) |
| "presets section" (left) | [src/components/sidebar/PresetSection.jsx](src/features/slate/components/sidebar/PresetSection.jsx) |
| "prefabs section" (left) | [src/components/sidebar/PrefabsSection.jsx](src/features/slate/components/sidebar/PrefabsSection.jsx) |
| "history actions" (undo/redo buttons) | [src/components/sidebar/HistoryActionsSection.jsx](src/features/slate/components/sidebar/HistoryActionsSection.jsx) |
| "right panel" | [src/components/RightPanel.jsx](src/features/slate/components/RightPanel.jsx) |
| "all players list" (right panel) | [src/components/rightPanel/AllPlayersSection.jsx](src/features/slate/components/rightPanel/AllPlayersSection.jsx) |
| "selected players" (right panel) | [src/components/rightPanel/SelectedPlayersSection.jsx](src/features/slate/components/rightPanel/SelectedPlayersSection.jsx) |
| "objects list" (right panel) | [src/components/rightPanel/ObjectsSection.jsx](src/features/slate/components/rightPanel/ObjectsSection.jsx) |
| "players section" (generic, right) | [src/components/rightPanel/PlayersSection.jsx](src/features/slate/components/rightPanel/PlayersSection.jsx) |
| "player row" | [src/components/rightPanel/PlayerRow.jsx](src/features/slate/components/rightPanel/PlayerRow.jsx) |
| "player edit panel" | [src/components/rightPanel/PlayerEditPanel.jsx](src/features/slate/components/rightPanel/PlayerEditPanel.jsx) |
| "player transform" (rotate/scale) | [src/components/rightPanel/PlayerTransformSection.jsx](src/features/slate/components/rightPanel/PlayerTransformSection.jsx) |
| "field settings" (right panel) | [src/components/rightPanel/FieldSettingsSection.jsx](src/features/slate/components/rightPanel/FieldSettingsSection.jsx) |
| "play name editor" | [src/components/rightPanel/PlayNameEditor.jsx](src/features/slate/components/rightPanel/PlayNameEditor.jsx) |
| "export actions" (right panel) | [src/components/rightPanel/ExportActions.jsx](src/features/slate/components/rightPanel/ExportActions.jsx) |
| "save prefab button" | [src/components/rightPanel/SavePrefabButton.jsx](src/features/slate/components/rightPanel/SavePrefabButton.jsx) |
| "advanced settings button" | [src/components/rightPanel/AdvancedSettingsButton.jsx](src/features/slate/components/rightPanel/AdvancedSettingsButton.jsx) |
| "recording mode toggle" (right panel) | [src/components/rightPanel/RecordingModeToggle.jsx](src/features/slate/components/rightPanel/RecordingModeToggle.jsx) |
| "recording player list" (right panel) | [src/components/rightPanel/RecordingPlayerList.jsx](src/features/slate/components/rightPanel/RecordingPlayerList.jsx) |
| "debug panel" (right panel) | [src/components/rightPanel/DebugPanel.jsx](src/features/slate/components/rightPanel/DebugPanel.jsx) |
| "notification bell" (app shell nav) | [src/components/NotificationBell.jsx](src/components/NotificationBell.jsx) |
| "mobile editor bar" | [src/components/MobileEditorBar.jsx](src/features/slate/components/MobileEditorBar.jsx) |
| "view-only controls" | [src/components/ViewOnlyControls.jsx](src/features/slate/components/ViewOnlyControls.jsx) |

### Modals / popovers
| User says... | Primary file(s) |
|---|---|
| "advanced settings modal" | [src/components/AdvancedSettings.jsx](src/features/slate/components/AdvancedSettings.jsx) + [src/components/advancedSettings/](src/features/slate/components/advancedSettings/) |
| "animation settings" (in modal) | [src/components/advancedSettings/AnimationSettingsSection.jsx](src/features/slate/components/advancedSettings/AnimationSettingsSection.jsx) |
| "player settings" (in modal) | [src/components/advancedSettings/PlayerSettingsSection.jsx](src/features/slate/components/advancedSettings/PlayerSettingsSection.jsx) |
| "ball settings" (in modal) | [src/components/advancedSettings/BallSettingsSection.jsx](src/features/slate/components/advancedSettings/BallSettingsSection.jsx) |
| "pitch settings" (in modal) | [src/components/advancedSettings/PitchSettingsSection.jsx](src/features/slate/components/advancedSettings/PitchSettingsSection.jsx) |
| "logger settings" (in modal) | [src/components/advancedSettings/LoggerSettingsSection.jsx](src/features/slate/components/advancedSettings/LoggerSettingsSection.jsx) |
| "export video settings" (in modal) | [src/components/advancedSettings/ExportVideoSettingsSection.jsx](src/features/slate/components/advancedSettings/ExportVideoSettingsSection.jsx) |
| "record debug panel" (in modal) | [src/components/advancedSettings/RecordDebugPanel.jsx](src/features/slate/components/advancedSettings/RecordDebugPanel.jsx) |
| "export modal" | [src/components/ExportModal.jsx](src/features/slate/components/ExportModal.jsx) |
| "export overlay" (progress) | [src/components/ExportOverlay.jsx](src/features/slate/components/ExportOverlay.jsx) |
| "save prefab modal" | [src/components/SavePrefabModal.jsx](src/features/slate/components/SavePrefabModal.jsx) |
| "save to playbook modal" | [src/components/SaveToPlaybookModal.jsx](src/components/SaveToPlaybookModal.jsx) |
| "auth prompt modal" | [src/components/AuthPromptModal.jsx](src/components/AuthPromptModal.jsx) |
| "confirm modal" | [src/components/subcomponents/ConfirmModal.jsx](src/features/slate/components/subcomponents/ConfirmModal.jsx) — compatibility shim over `ConfirmDialog` (Session 4); new code should use `ConfirmDialog` from the design-system barrel |
| "color picker popover" | [src/components/subcomponents/ColorPickerPopover.jsx](src/features/slate/components/subcomponents/ColorPickerPopover.jsx) |
| "prefabs popover" | [src/components/subcomponents/PrefabsPopover.jsx](src/features/slate/components/subcomponents/PrefabsPopover.jsx) |
| "generic popovers" | [src/components/subcomponents/Popovers.jsx](src/features/slate/components/subcomponents/Popovers.jsx) |
| "screenshot confirm bar" | [src/components/ScreenshotConfirmBar.jsx](src/features/slate/components/ScreenshotConfirmBar.jsx) |
| "message popup", "toast / notifications" | [src/components/MessagePopup/MessagePopup.jsx](src/components/MessagePopup/MessagePopup.jsx) + [src/components/MessagePopup/useMessagePopup.js](src/components/MessagePopup/useMessagePopup.js) (barrel: [index.js](src/components/MessagePopup/index.js)) |
| "mobile view-only gate" | [src/components/MobileViewOnlyGate.jsx](src/features/slate/components/MobileViewOnlyGate.jsx) |

### Recording mode
| User says... | Primary file(s) |
|---|---|
| "recording state / hook" | [src/features/slate/hooks/useRecordingMode.js](src/features/slate/hooks/useRecordingMode.js) |
| "recording control bar" (replaces ControlPill) | [src/components/RecordingControlBar.jsx](src/features/slate/components/RecordingControlBar.jsx) |
| "recording countdown" | [src/components/RecordingCountdown.jsx](src/features/slate/components/RecordingCountdown.jsx) |
| "recording timeline pill" | [src/components/RecordingTimelinePill.jsx](src/features/slate/components/RecordingTimelinePill.jsx) |

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
| "GIF export", "gif encoder", "play to GIF" | [src/utils/gifEncoder.js](src/utils/gifEncoder.js) |
| "save play to server" (API client) | [src/api/apiPlays.js](src/api/apiPlays.js) |
| "folders API client" | [src/api/apiFolders.js](src/api/apiFolders.js) |
| "prefabs API client" | [src/api/prefabsApi.js](src/api/prefabsApi.js) |
| "playbook sections API client" | [src/api/playbookSectionsApi.js](src/api/playbookSectionsApi.js) |
| "notifications API client" | [src/api/notificationsApi.js](src/api/notificationsApi.js) |
| "generic API helper / fetch" | [src/api/api.js](src/api/api.js) |
| "local autosave for plays" | [src/utils/appPlaysStorage.js](src/utils/appPlaysStorage.js) |
| "playbook localStorage" | [src/utils/playbookStorage.js](src/utils/playbookStorage.js) |
| "custom prefabs (local)" | [src/utils/customPrefabs.js](src/utils/customPrefabs.js) |
| "sport prefab presets" (published prefabs) | [src/utils/sportPrefabPresets.js](src/utils/sportPrefabPresets.js) |
| "data contracts / shape validation" | [src/utils/dataContracts.js](src/utils/dataContracts.js) |
| "input validation" | [src/utils/inputValidation.js](src/utils/inputValidation.js) |

### Notifications (in-app inbox)
| User says... | Primary file(s) | Notes |
|---|---|---|
| "notification bell", "bell badge", "bell dropdown" | [src/components/NotificationBell.jsx](src/components/NotificationBell.jsx) | Bell icon + unread badge + dropdown panel in the app shell nav |
| "notifications context", "notifications provider", "unread count" | [src/context/NotificationsContext.jsx](src/context/NotificationsContext.jsx) | Shared state: list, unreadCount, markRead, markAllRead, respond; polls every 60 s |
| "notifications page", "app inbox" | [src/pages/app/Notifications.jsx](src/pages/app/Notifications.jsx) | Master/detail inbox at `/app/notifications`; inline response forms |
| "notifications API client" | [src/utils/notificationsApi.js](src/utils/notificationsApi.js) | apiFetch wrappers for `/notifications/*` endpoints |
| "notifications server route" | [server/routes/notifications.js](server/routes/notifications.js) | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /:id/read`, `POST /:id/respond` |
| "notification audience helpers", "notifAudienceSql" | [server/lib/notificationAudience.js](server/lib/notificationAudience.js) | Pure: `buildNotifAudienceSql`, `buildNotifAudienceLabel`, `aggregateNotifResponses` |
| "admin notifications composer" | [src/pages/AdminNotificationsPage.jsx](src/pages/AdminNotificationsPage.jsx) | Owner-only authoring page at `/admin/notifications`; see [NOTIFICATIONS_PAGE.md](src/pages/NOTIFICATIONS_PAGE.md) |

### Auth / context / routing
| User says... | Primary file(s) |
|---|---|
| "auth context", "current user", "login state" | [src/context/AuthContext.jsx](src/context/AuthContext.jsx) |
| "notifications context" | [src/context/NotificationsContext.jsx](src/context/NotificationsContext.jsx) |
| "app-wide messages" | [src/context/AppMessageContext.jsx](src/context/AppMessageContext.jsx) |
| "routes", "router", "all pages" | [src/App.jsx](src/App.jsx) |
| "app shell layout" (nav chrome) | [src/components/layout/AppLayout.jsx](src/components/layout/AppLayout.jsx) |
| "page layout components", "AppShell", "AppPage", "AppSection", "AppCard", "AppHeader" | [src/components/layout/](src/components/layout/) ([LAYOUT.md](src/components/layout/LAYOUT.md), barrel: [index.js](src/components/layout/index.js)) |
| "admin elevation / session" | [src/api/adminElevation.js](src/api/adminElevation.js) |
| "error reporter" | [src/utils/errorReporter.js](src/utils/errorReporter.js) |
| "mobile viewport fixes" | [src/utils/mobileViewport.js](src/utils/mobileViewport.js) |
| "theme color hook" | [src/hooks/useThemeColor.js](src/hooks/useThemeColor.js) |
| "page meta hook" | [src/hooks/usePageMeta.js](src/hooks/usePageMeta.js) |

### Dev overlay
| User says... | Primary file(s) | Notes |
|---|---|---|
| "dev overlay", "component overlay", "Ctrl+Shift+D", "orange outlines", "component badges" | [src/components/DevOverlay/DevOverlay.jsx](src/components/DevOverlay/DevOverlay.jsx) | Dev-only; toggles `data-dev-overlay` on `<html>`; CSS in `devOverlay.css`; wired in `App.jsx` behind `import.meta.env.DEV` |
| "dev overlay CSS" | [src/components/DevOverlay/devOverlay.css](src/components/DevOverlay/devOverlay.css) | Scoped to `[data-dev-overlay]`: dashed outline on `[data-component]`, `::before` badge on hover |
| "dev overlay tests" | [src/test/DevOverlay.test.jsx](src/test/DevOverlay.test.jsx) | jsdom env; 3 tests: toggle on, toggle off, non-matching keys |

### Play preview cards (used in playbooks/folders/grid)
| User says... | Primary file(s) |
|---|---|
| "play preview card" | [src/components/PlayPreviewCard.jsx](src/components/PlayPreviewCard.jsx) |
| "play preview player" (auto-play thumbnail) | [src/components/PlayPreviewPlayer.jsx](src/components/PlayPreviewPlayer.jsx) |
| "admin play card", "AdminPlayCard" | [src/admin/components/AdminPlayCard.jsx](src/admin/components/AdminPlayCard.jsx) — extracted from AdminPlaysPage; multi-step menu, permission flags, inline rename; barrel: `src/admin/components/index.js` |
| "admin folder card", "AdminFolderCard" | [src/admin/components/AdminFolderCard.jsx](src/admin/components/AdminFolderCard.jsx) — folder card with inline rename; barrel: `src/admin/components/index.js` |
| "admin section row", "AdminSectionRow" | [src/admin/components/AdminSectionRow.jsx](src/admin/components/AdminSectionRow.jsx) — section row with play picker and priority toggle; barrel: `src/admin/components/index.js` |
| "app play card", "PlayCard" (app Plays page) | [src/components/PlayCard.jsx](src/components/PlayCard.jsx) — self-contained play card (rename, favorite, share, bulk, drag); context menu uses `<Menu>` + `<MenuItem>` from design-system (Session 4) |
| "app folder card", "FolderCard" (app Plays page) | [src/components/FolderCard.jsx](src/components/FolderCard.jsx) — folder card with drag-drop, inline rename; context menu uses `<Menu>` + `<MenuItem>` from design-system (Session 4) |
| "team switcher" | [src/components/TeamSwitcher.jsx](src/components/TeamSwitcher.jsx) |
| "sport-aware public nav" | [src/components/SportAwarePublicNav.jsx](src/components/SportAwarePublicNav.jsx) |

### Debug loggers (toggled in advanced-settings logger section)
All under [src/animation/](src/animation/), [src/canvas/](src/canvas/), [src/features/slate/](src/features/slate/), [src/utils/](src/utils/):
- `debugLogger.js` (animation), `keyframeMoveDebugLogger.js` (animation)
- `debug/drawDebugLogger.js`, `debug/keyboardToolDebugLogger.js` (canvas/debug/)
- `debug/placeBallDebugLogger.js`, `debug/recordingDebugLogger.js`, `debug/rotationDebugLogger.js`, `debug/prefabDebugLogger.js` (slate/debug/)
- `videoExportDebugLogger.js`, `playPersistenceDebugLogger.js` (utils)

---

## Pages (`src/pages/`)

### Public / marketing
| Path | File |
|---|---|
| `/`, `/home`, `/rugby`, `/football`, etc. | [Landing.jsx](src/pages/public/Landing.jsx) |
| `/rugby/playbooks`, etc. | [PublicPlaybooksPage.jsx](src/pages/public/PublicPlaybooksPage.jsx) |
| `/resources` | [Resources.jsx](src/pages/public/Resources.jsx) |
| `/enterprise` | [Enterprise.jsx](src/pages/public/Enterprise.jsx) |
| `/signup` | [Signup.jsx](src/pages/auth/Signup.jsx) |
| `/login` | [Login.jsx](src/pages/auth/Login.jsx) |
| `/forgot-password` | [ForgotPassword.jsx](src/pages/auth/ForgotPassword.jsx) |
| `/reset-password` | [ResetPassword.jsx](src/pages/auth/ResetPassword.jsx) |
| `/onboarding` | [Onboarding.jsx](src/pages/Onboarding.jsx) — two-step wizard for "Create Team": name → sport selection (required); see [SPORT_ONBOARDING_SELECTION.md](src/pages/SPORT_ONBOARDING_SELECTION.md) |
| `/verify-email` | [VerifyEmail.jsx](src/pages/auth/VerifyEmail.jsx) |
| `/no-team` | [NoTeam.jsx](src/pages/NoTeam.jsx) |
| `/slate`, `/slate/:sport` | [SportPickerPage.jsx](src/pages/SportPickerPage.jsx) (picker) → SlateRoot wrapper in App.jsx |
| `*` (404) | [NotFound.jsx](src/pages/NotFound.jsx) |

### Sharing
| Path | File |
|---|---|
| `/shared/:token` | [SharedPlay.jsx](src/pages/public/SharedPlay.jsx) |
| `/shared/:token/view` | [SharedPlayView.jsx](src/pages/public/SharedPlayView.jsx) |
| `/shared/folder/:token` | [SharedFolder.jsx](src/pages/public/SharedFolder.jsx) |
| `/platform-play/:playId` | [PlatformPlayView.jsx](src/pages/public/PlatformPlayView.jsx) |

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
| `/app/notifications` (in-app inbox) | [pages/app/Notifications.jsx](src/pages/app/Notifications.jsx) |

### Admin (`/admin/*`)
| Path | File |
|---|---|
| `/admin` (login) | [pages/admin/Admin.jsx](src/pages/admin/Admin.jsx) |
| `/admin/tests` | [pages/admin/AdminTests.jsx](src/pages/admin/AdminTests.jsx) |
| `/admin/errors` | [pages/admin/AdminErrors.jsx](src/pages/admin/AdminErrors.jsx) |
| `/admin/slate` | SlateRoot (in App.jsx) → [features/slate/Slate.jsx](src/features/slate/Slate.jsx) |
| `/admin/record` | SlateRecordRoot → [features/slate/SlateRecord.jsx](src/features/slate/SlateRecord.jsx) |
| `/admin/drawing` | SlateDrawingRoot → [features/slate/SlateDrawing.jsx](src/features/slate/SlateDrawing.jsx) |
| `/admin/app` | [pages/admin/AdminPlaysPage.jsx](src/pages/admin/AdminPlaysPage.jsx) |
| `/admin/plays/:playId/edit` | [pages/admin/AdminPlayEditPage.jsx](src/pages/admin/AdminPlayEditPage.jsx) |
| `/admin/presets/:sport` | [pages/admin/AdminSportPresetsPage.jsx](src/pages/admin/AdminSportPresetsPage.jsx) |
| `/admin/presets/:sport/:presetId/edit` | [pages/admin/AdminPresetEditPage.jsx](src/pages/admin/AdminPresetEditPage.jsx) |
| `/admin/prefab-presets/:sport` | [pages/admin/AdminSportPrefabPresetsPage.jsx](src/pages/admin/AdminSportPrefabPresetsPage.jsx) |
| `/admin/prefab-presets/:sport/:prefabPresetId/edit` | [pages/admin/AdminPrefabPresetEditPage.jsx](src/pages/admin/AdminPrefabPresetEditPage.jsx) |
| `/admin/users/:userId` | [pages/admin/AdminUserActivity.jsx](src/pages/admin/AdminUserActivity.jsx) |
| `/admin/user-issues` | [pages/admin/AdminUserIssues.jsx](src/pages/admin/AdminUserIssues.jsx) |
| `/admin/mobile-view` | [pages/admin/AdminMobileView.jsx](src/pages/admin/AdminMobileView.jsx) |
| `/admin/test` | [pages/admin/AdminTestSlate.jsx](src/pages/admin/AdminTestSlate.jsx) |
| `/admin/gif-test` | [pages/admin/AdminGIFTest.jsx](src/pages/admin/AdminGIFTest.jsx) |
| `/admin/demo-videos` | [pages/admin/AdminDemoVideos.jsx](src/pages/admin/AdminDemoVideos.jsx) |
| `/admin/one-page` | [pages/admin/AdminOnePage.jsx](src/pages/admin/AdminOnePage.jsx) |
| `/admin/design-rules` (+`/:section`, admin-only) — **Design System** | [designSystem/DesignSystemPage.jsx](src/admin/designSystem/DesignSystemPage.jsx) — multi-page design system (foundations, tokens, components, patterns, templates, cross-cutting rules, Slate UI); see [DESIGN_SYSTEM.md](src/admin/designSystem/DESIGN_SYSTEM.md). Nav metadata in [designSystemNav.js](src/admin/designSystem/designSystemNav.js), slug→component map in [designSystemSections.js](src/admin/designSystem/designSystemSections.js), shared primitives in [dsPrimitives.jsx](src/admin/designSystem/dsPrimitives.jsx), one file per section in [sections/](src/admin/designSystem/sections/) |

**Design tokens / theming (single source of truth):** the product brand palette lives in [src/index.css](src/index.css) (`@theme --color-Brand*`, used app-wide via Tailwind classes like `bg-BrandBlack`; light neutrals via `[data-theme="light"] .app-themed` + `[data-admin-theme="light"]`). The admin/design-system `--adm-*` tokens in [src/admin/admin.css](src/admin/admin.css) **alias and `color-mix`-derive from** those brand tokens (scoped to `[data-admin-theme="dark"|"light"]`, set by [AdminShell.jsx](src/admin/components/AdminShell.jsx)) — change a `--color-Brand*` value once and it ripples through app + admin + design system. Guarded by `designTokenUnification.test.js`. **Not yet migrated:** the Slate editor + main `src/components`/`src/canvas` still use hardcoded hex / Tailwind color classes.
| `/admin/notifications` (owner-only) | [pages/admin/AdminNotificationsPage.jsx](src/pages/admin/AdminNotificationsPage.jsx) — see [NOTIFICATIONS_PAGE.md](src/pages/NOTIFICATIONS_PAGE.md) |
| `/admin/outreach-scraper` (owner-only) | [pages/admin/AdminOutreachScraperPage.jsx](src/pages/admin/AdminOutreachScraperPage.jsx) — scrape college athletic staff directories → filter → CSV; see [OUTREACH_SCRAPER.md](server/lib/outreachScraper/OUTREACH_SCRAPER.md) |

### Staff admin (`/staff/*`)
Scoped sub-admins invited by the owner. See [STAFF_ADMIN_PLAN.md](.codex/STAFF_ADMIN_PLAN.md). Pages reuse the existing Admin* components with `basePath="/staff"` and `mode="staff"` on `<AdminProvider>`.

| Path | File |
|---|---|
| `/staff/login` | [StaffLogin.jsx](src/pages/auth/StaffLogin.jsx) |
| `/staff/accept-invite` | [StaffAcceptInvite.jsx](src/pages/StaffAcceptInvite.jsx) |
| `/staff` (dashboard) | [StaffDashboard.jsx](src/pages/StaffDashboard.jsx) |
| `/staff/app` | reuses [pages/admin/AdminPlaysPage.jsx](src/pages/admin/AdminPlaysPage.jsx) |
| `/staff/plays/:playId/edit` | reuses [pages/admin/AdminPlayEditPage.jsx](src/pages/admin/AdminPlayEditPage.jsx) |
| `/staff/presets/:sport[/:presetId/edit]` | reuses [pages/admin/AdminSportPresetsPage.jsx](src/pages/admin/AdminSportPresetsPage.jsx) / [pages/admin/AdminPresetEditPage.jsx](src/pages/admin/AdminPresetEditPage.jsx) |
| `/staff/prefab-presets/:sport[/:prefabPresetId/edit]` | reuses [pages/admin/AdminSportPrefabPresetsPage.jsx](src/pages/admin/AdminSportPrefabPresetsPage.jsx) / [pages/admin/AdminPrefabPresetEditPage.jsx](src/pages/admin/AdminPrefabPresetEditPage.jsx) |
| `/staff/users/:userId` | reuses [pages/admin/AdminUserActivity.jsx](src/pages/admin/AdminUserActivity.jsx) |
| `/staff/user-issues` | reuses [pages/admin/AdminUserIssues.jsx](src/pages/admin/AdminUserIssues.jsx) |
| `/staff/errors` | reuses [pages/admin/AdminErrors.jsx](src/pages/admin/AdminErrors.jsx) |
| `/staff/demo-videos` | reuses [pages/admin/AdminDemoVideos.jsx](src/pages/admin/AdminDemoVideos.jsx) |
| `/staff/one-page` | reuses [pages/admin/AdminOnePage.jsx](src/pages/admin/AdminOnePage.jsx) |
| `/staff/tests` | reuses [pages/admin/AdminTests.jsx](src/pages/admin/AdminTests.jsx) |

---

## Admin shared UI (`src/admin/`)
| User says... | Primary file(s) | Notes |
|---|---|---|
| "design-system primitives", "Button", "Input", "Field", "Modal", "Card", "Divider", "ConfirmDialog", "Toast", "Menu", "MenuItem", "Popover", etc. | [src/design-system/components/](src/design-system/components/) (barrel: [index.js](src/design-system/components/index.js)) | Canonical shared components; `Field` owns label/hint/error/count layout; `Divider` provides tokenized horizontal/vertical separation; AdminX names are barrel aliases. Session 2 form migration: [SESSION_2_FORM_MIGRATION.md](src/design-system/SESSION_2_FORM_MIGRATION.md). Session 3 feedback/surface migration: [SESSION_3_FEEDBACK_SURFACE_MIGRATION.md](src/design-system/SESSION_3_FEEDBACK_SURFACE_MIGRATION.md). Session 4 overlays (ConfirmDialog, Toast, Menu/MenuItem, Popover): [SESSION_4_OVERLAYS.md](src/design-system/SESSION_4_OVERLAYS.md) |

- [adminNav.js](src/admin/adminNav.js) — admin nav config
- [AdminContext.jsx](src/admin/AdminContext.jsx) — theme + admin session context + (for staff mode) permissions, hasPerm, hasSportScope
- [adminTransport.js](src/admin/adminTransport.js) — `adminFetchOptions`, `adminApi` — shared transport that sends BOTH legacy admin session header AND JWT cookie + Bearer so the same /admin/* endpoints work for owner and staff
- [StaffAdminManager.jsx](src/admin/StaffAdminManager.jsx) — owner-only UI mounted in the /admin dashboard for inviting + revoking staff admins
- **components/**: AdminShell, AdminPage, AdminSection, AdminHeader, AdminNav (perm-filtered), AdminSidebar, AdminCard, AdminBtn, AdminInput, AdminSelect, AdminTextarea, AdminCheckbox, AdminToggle, AdminRadioGroup, AdminBadge, AdminAlert, AdminAvatar, AdminEmptyState, AdminSpinner, AdminModal, AdminTabs, AdminTooltip, AdminChip, AdminPagination (+ pure `getPaginationRange` in `paginationRange.js`), AdminSkeleton, AdminProgress, AdminBreadcrumbs, **AdminPlayCard, AdminFolderCard, AdminSectionRow** (Phase 2 extractions from AdminPlaysPage; shared styles in `adminPlayStyles.js`) — see [src/admin/components/](src/admin/components/)
- **analytics/**: AnalyticsDashboard + KpiStrip, KpiCard, ActivityFeed, UserGrowthChart, SportMixChart, PlayActivityChart, OnboardingFunnel, useDashboardAnalytics — see [src/admin/analytics/](src/admin/analytics/)
- **Design System** ("design system", "design rules", "component catalog", "style guide", "design tokens", "design system search", "command palette"): [src/admin/designSystem/](src/admin/designSystem/) at `/admin/design-rules` — see [DESIGN_SYSTEM.md](src/admin/designSystem/DESIGN_SYSTEM.md). Search: pure ranking in [designSystemSearch.js](src/admin/designSystem/designSystemSearch.js); sidebar filter + ⌘K palette UI in [SearchPalette.jsx](src/admin/designSystem/SearchPalette.jsx). (NB: `.js` logic vs `.jsx` UI are named to avoid a case-only filename collision on Windows.)

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
| `/sport-prefab-presets` | [routes/sportPrefabPresets.js](server/routes/sportPrefabPresets.js) |
| `/notifications` (user-facing in-app inbox; admin authoring lives under `/admin/notifications`) | [routes/notifications.js](server/routes/notifications.js) |
| `/admin/outreach` (owner-only outreach scraper; scrape/staff/export endpoints) | [routes/outreach.js](server/routes/outreach.js) — scraper lib in [server/lib/outreachScraper/](server/lib/outreachScraper/) |

### Middleware / lib / utils / config
- [middleware/auth.js](server/middleware/auth.js) — JWT/session middleware (also exports `verifySessionToken`, `readSessionToken` for compositional auth)
- [middleware/staffAuth.js](server/middleware/staffAuth.js) — scoped staff-admin auth: `requireAdminOrStaff`, `requireOwnerOrLegacyAdmin`, `requirePerm`, `requireAnyPerm`, `requireSportScope`, `redactByPerm`, `writeAudit`, `isOwner`, `resolveActor` (see [STAFF_ADMIN_PLAN.md](.codex/STAFF_ADMIN_PLAN.md))
- [routes/staff.js](server/routes/staff.js) — public-or-JWT staff endpoints: `GET /staff/session`, `POST /staff/accept-invite`
- [lib/email.js](server/lib/email.js) — Resend email helpers
- [lib/userTeams.js](server/lib/userTeams.js) — user↔team queries
- [lib/notificationAudience.js](server/lib/notificationAudience.js) — pure notification helpers: `buildNotifAudienceSql`, `buildNotifAudienceLabel`, `aggregateNotifResponses` (used by `/admin/notifications/*`)
- [utils/syncSports.js](server/utils/syncSports.js) — startup sport seed
- [utils/syncPlaybookDefaults.js](server/utils/syncPlaybookDefaults.js) — startup playbook seed
- [config/sports.js](server/config/sports.js) — sport definitions / field configs
- [scripts/compare-dbs.js](server/scripts/compare-dbs.js) — diff Postgres DBs

### Database
- [db/schema.sql](server/db/schema.sql) — full schema (idempotent, auto-run on boot)
- [db/migrate.js](server/db/migrate.js) — standalone migration runner
- [db/pool.js](server/db/pool.js) — `pg` Pool export

**Tables** (from schema.sql): `users`, `email_verification_codes`, `user_preferences`, `teams`, `team_settings`, `team_memberships`, `team_invite_codes`, `team_invites`, `team_join_requests`, `play_folders`, `plays`, `play_tags`, `play_tag_links`, `play_favorites`, `play_share_links`, `folder_share_links`, `error_reports`, `password_reset_codes`, `platform_play_folders`, `platform_plays`, `page_sections`, `user_issues`, `playbook_sections`, `playbook_section_plays`, `demo_videos`, `user_prefabs`, `admin_prefabs`, `sport_presets`, `sport_prefab_presets`, `staff_admins`, `staff_admin_invites`, `admin_audit_log`, `notifications`, `notification_recipients`, `notification_responses`, `outreach_schools`, `outreach_scraped_staff`.

---

## Tests (`test-harness/test/`)
All run via Vitest. One file per feature; create new ones here when adding tests.

- Shared design system: `sharedFormControls.test.jsx`, `sharedFeedbackComponents.test.js`, `designSystemBarrel.test.js`

- Auth/account: `forgotPassword.test.js`, `accountDeletedEmail.test.js`, `onboarding.test.js`, `sportOnboarding.test.js` (canAdvance logic, sport payload, SPORTS shape, solo flow, Blank Canvas), `inputValidation.test.js` (validateEmail/Name/Password/ConfirmPassword, isValidEmail, isValidPhone, INPUT_LIMITS — 43 tests)
- App layout system: `appLayout.test.js` (AppShell/AppPage/AppHeader/AppSection/AppCard — scroll-rule guard, maxWidth mapping, padding/header rendering logic; see `src/components/layout/LAYOUT.md`)
- Admin shell: `adminBtn.test.js`, `adminModal.test.js`, `adminNav.test.js`, `adminShell.test.js`, `adminDangerMode.test.js`, `analyticsDashboard.test.js`, `usersHideFilters.test.js`, `designSystem.test.js` (design system nav registry: slug integrity, default section, prev/next adjacency), `designSystemSearch.test.js` (design system search ranking: keyword/label/summary matching, case-insensitivity, result limit), `designTokenUnification.test.js` (single-source-of-truth guard: admin `--adm-*` tokens must derive from the brand `--color-Brand*` palette; fails if admin drifts back to a parallel hex palette), `adminPagination.test.js` (getPaginationRange: short ranges, ellipsis collapsing, clamping), `componentExtraction.test.js` (Phase 2 component logic mirrors: AdminPlayCard permission flags + menu-step machine, AdminFolderCard/FolderCard inline-rename flow, AdminSectionRow priority warning + play-picker filter, PlayCard bulk-select + rename + canPost guard, FolderCard subfolder subtitle + drag ring)
- Plays/folders/playbooks: `localStorageAutosave.test.js`, `platformPlays.test.js`, `playbookFolderBrowse.test.js`, `playbookSections.test.js`, `landingPlaybooksNav.test.js`, `playPreviewCardCones.test.js`, `playPreviewPlayer.test.js`, `playCopyAnalytics.test.js`, `sportPresets.test.js`, `presetBallCycle.test.js`, `presetEditorMode.test.js`, `hideFromPlayers.test.js`, `sportNavContext.test.js`, `syncSports.test.js`, `adminPlayCardConsistency.test.js` (PlayCard `canRemoveFromSection` logic + section play enrichment + picker exclusion)
- Drawing/keyframe: `keyframeStyling.test.js`, `drawingModePreviewAnimation.test.js`, `drawingFlipReflect.test.js`, `drawingModeUndoRedo.test.js`, `drawingScopeSeparation.test.js`, `annotationDrawingVisibility.test.js`, `drawingExportV3Migration.test.js`, `trackSnap.test.js`
- Misc: `videoEncoder.test.js`, `errorReporter.test.js`, `demoVideos.test.js`, `adminNotifications.test.js` (notification audience SQL + response aggregation), `notificationsRetry.test.js` (NotificationsContext retry-on-failure logic — jsdom env), `outreachScraper.test.js` (sidearm parsers + sport/role normalization + CSV escaping; fixtures in `test-harness/test/fixtures/`), `mobileTouchGestures.test.js` (two-finger pan/pinch math for the mobile editor canvas — `src/canvas/touchGestures.js`)

In-source unit suite for canvas geometry: [src/canvas/__tests__/drawingGeometry.test.js](src/canvas/__tests__/drawingGeometry.test.js).
Suites used by the admin test runner: [src/testing/suites/](src/testing/suites/) (animationSchema, drawingGeometry, importExport, interpolate) and [src/testing/testRunner.js](src/testing/testRunner.js).

**RTL / virtual-DOM rendering tests** (`src/test/` — jsdom env, Phase 3):
- `AppPage.test.jsx` — overflow-y-auto invariant, maxWidth token mapping, data-component attr (9 tests)
- `AppHeader.test.jsx` — title/subtitle rendering, back-link presence/absence, actions slot, children slot (8 tests)
- `AdminPlayCard.test.jsx` — canEdit gate (Edit button), hasSecondaryActions gate (three-dots trigger), per-permission menu items: Delete, Copy link, Duplicate, Rename (11 tests)
- `FolderCard.test.jsx` — folder name/subtitle, play-count singular/plural, subfolder count, isDragOver "Drop Here" label, isCoach menu gate, inline rename flow (12 tests)
- `PlayCard.test.jsx` — title, bulkMode checkbox visibility, onToggleSelect click in bulk mode, isCoach three-dots gate, canPostToCommunity gate (9 tests)
- `DevOverlay.test.jsx` — Ctrl+Shift+D toggle on, toggle off, non-matching keys ignored (3 tests)
- `Tabs.test.jsx` — controlled tab changes and active `aria-selected` state
- `setup.js` — Vitest setup: extends expect with `@testing-library/jest-dom` matchers; `globals: true` in vitest.config.js enables RTL auto-cleanup via global afterEach

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
- [src/pages/SPORT_PREFAB_PRESETS.md](src/pages/SPORT_PREFAB_PRESETS.md) — admin-published prefab presets that surface in the Slate Prefabs panel per sport (distinct from full-canvas sport presets)
- [src/features/slate/README.md](src/features/slate/README.md) — slate architecture overview
- [src/features/slate/DRAWING_SEPARATION.md](src/features/slate/DRAWING_SEPARATION.md) — annotation/motion drawing split (read before touching drawings, palettes, eraser scope, or the v3 import/export pipeline)
- [src/features/slate/DRAWING_MODE_UNDO_REDO.md](src/features/slate/DRAWING_MODE_UNDO_REDO.md)
- [src/features/slate/KEYFRAME_HIGHLIGHT_EDIT_FIX.md](src/features/slate/KEYFRAME_HIGHLIGHT_EDIT_FIX.md)
- [src/features/slate/LOCALSTORAGE_AUTOSAVE.md](src/features/slate/LOCALSTORAGE_AUTOSAVE.md)
- [src/canvas/canvas.md](src/canvas/canvas.md), [src/canvas/object-snapping.md](src/canvas/object-snapping.md)
- [src/features/slate/components/controlPill/TRACK_SNAPPING.md](src/features/slate/components/controlPill/TRACK_SNAPPING.md) — CapCut/VN-style timeline snapping for motion + annotation track bars
- [src/components/PLAY_PREVIEW_DRAWING_MODE.md](src/components/PLAY_PREVIEW_DRAWING_MODE.md), [src/components/PLAY_PREVIEW_PLAYER.md](src/components/PLAY_PREVIEW_PLAYER.md)
- [server/routes/DEMO_VIDEOS.md](server/routes/DEMO_VIDEOS.md), [server/routes/FORGOT_PASSWORD.md](server/routes/FORGOT_PASSWORD.md), [server/routes/PLAY_COPY_ANALYTICS_FIX.md](server/routes/PLAY_COPY_ANALYTICS_FIX.md)
- [server/PLAYBOOK_SECTIONS.md](server/PLAYBOOK_SECTIONS.md), [server/ONBOARDING_SEED_PLAY.md](server/ONBOARDING_SEED_PLAY.md), [server/lib/ACCOUNT_DELETED_EMAIL.md](server/lib/ACCOUNT_DELETED_EMAIL.md)
- [server/lib/outreachScraper/OUTREACH_SCRAPER.md](server/lib/outreachScraper/OUTREACH_SCRAPER.md) — outreach staff-directory scraper (Sidearm legacy/nextgen parsers, sport/role normalization, CSV export); design rationale in [OUTREACH_SCRAPER_PLAN.md](OUTREACH_SCRAPER_PLAN.md)
- [src/admin/designSystem/DESIGN_SYSTEM.md](src/admin/designSystem/DESIGN_SYSTEM.md) — the admin Design System reference (`/admin/design-rules`): structure, shared primitives, status vocabulary, the 38 sections, and how to extend it (read before adding/renaming design-system sections)
- [src/admin/designSystem/CONSOLIDATION_ROADMAP.md](src/admin/designSystem/CONSOLIDATION_ROADMAP.md) — master tracker for making design-rules the single source of truth across ALL axes (color, type, spacing, radius, elevation, motion, z-index, icons), plus live-component reconciliation (17 of 38 sections are still static mockups), shared-primitive extraction, guard tests, intentional exclusions, and recommended order (read before continuing any design-system consolidation work)
