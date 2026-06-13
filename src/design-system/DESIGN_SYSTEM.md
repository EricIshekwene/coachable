# Shared Design System

## Directory Layout

- `components/` contains one PascalCase `.jsx` file per shared primitive.
- `components/index.js` is the canonical public barrel and re-exports the existing app layout components without moving them.

## Imports

```jsx
import { Button, Card } from "../../design-system/components";
```

Shared component names use PascalCase and have no surface prefix.

## Component Contract

- Use `var(--ui-*)` for colors, surfaces, borders, and semantic states. Never depend on `--adm-*`.
- Put `data-component="ComponentName"` on the outermost DOM element.
- Forward native element props and `className`.
- Forward refs to a component's single primary focusable element. Multi-control composites do not expose an arbitrary child ref.
- Add JSDoc for every exported component and document its props.

## Admin Compatibility

`src/admin/components/index.js` aliases canonical components under their existing `AdminX` names. Thin files remain at the legacy `src/admin/components/AdminX.jsx` paths for direct imports. New shared code should use canonical names.

## Adding A Component

1. Create the component file under `components/`.
2. Export it from `components/index.js`.
3. Add an admin alias when backward compatibility requires one.
4. Add the canonical export and alias to `admin/test/designSystemBarrel.test.js`.
5. Update `CRAWLER_MAP.md`.
