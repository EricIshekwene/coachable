# Messaging Modules

## `useMessagePopup`

Responsibility: manage transient popup/toast state for `MessagePopup` without rendering UI.

Inputs:
- none

Outputs:
- `messagePopup`: `{ visible, message, subtitle, type }`
- `showMessage(message, subtitle = "", type = "standard", duration = 3000)`
- `hideMessage()`

Key state shape:
- `messagePopup.visible`: boolean
- `messagePopup.message`: string
- `messagePopup.subtitle`: string
- `messagePopup.type`: `"standard" | "success" | "error"` (UI component decides supported values)

Notes:
- `duration` is preserved in the signature for compatibility and is currently unused.
