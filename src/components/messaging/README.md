# Messaging Modules

## `useMessagePopup`

Responsibility: manage transient popup/toast state for `MessagePopup` without rendering UI.

Inputs:
- none

Outputs:
- `messagePopup`: `{ visible, message, subtitle, type, autoHideDuration }`
- `showMessage(message, subtitle = "", type = "standard", duration = 3000)`
- `hideMessage()`

Key state shape:
- `messagePopup.visible`: boolean
- `messagePopup.message`: string
- `messagePopup.subtitle`: string
- `messagePopup.type`: `"standard" | "success" | "error" | "warning"` (UI component decides supported values)
- `messagePopup.autoHideDuration`: number (milliseconds)

Notes:
- `duration` from `showMessage(...)` is applied to `messagePopup.autoHideDuration`.
