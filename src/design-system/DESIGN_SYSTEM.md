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

## Form Components

- `Field` owns shared label, required marker, hint, error, and character-count layout.
- `Button` supports semantic variants including `danger-outline`, polymorphic `as`,
  stable-width loading state, full-width layout, and start/end icons.
- `Input` supports start icons, end actions, `default`/`search`/`code` appearances,
  and optional self-wrapping `Field` props.
- `Textarea` supports the shared `Field` props and `none`/`vertical`/`both` resize modes.
- `Select` supports the shared `Field` props while retaining the canonical chevron.

## Feedback, Surfaces, And Navigation

| Component | Purpose | Session 3 props |
|---|---|---|
| `Spinner` | Indeterminate loading feedback | `size`, `tone`, `label` |
| `Skeleton` | Layout-preserving loading placeholder | `variant`, `width`, `height`, `lines` |
| `Alert` | Persistent inline status or error message | `tone`, `title` |
| `EmptyState` | No-results and no-content layouts | `icon`, `description`, `action`, `contained` |
| `Badge` | Compact semantic status, count, or duration | `tone`, `size`, `dot` |
| `Chip` | Selectable filter or removable tag | `selected`, `onClick`, `onRemove` |
| `Avatar` | User image or initials fallback | `name`, `src`, `size`, `status` |
| `Divider` | Horizontal or vertical content separation | `orientation`, `tone` |
| `Tabs` | Segmented or underline sibling navigation | `items`, `value`, `onChange`, `variant` |
| `Breadcrumbs` | Hierarchical navigation trail | `items` |
| `Card` | Shared content surface | `padding`, `interactive`, `selected`, `tone`, `as` |
| `Section` | Heading, subtitle, icon, actions, and content grouping | `subtitle`, `icon`, `actions`, `variant` |

Use `Spinner` when the duration is unknown and the surrounding layout does not need
to be previewed. Use `Skeleton` when preserving the shape of incoming content reduces
layout shift. Use `Alert` for persistent status attached to page content; use the
application toast/message system for brief confirmation that does not need to remain
in the document flow.

## Admin Compatibility

`src/admin/components/index.js` aliases canonical components under their existing `AdminX` names. Thin files remain at the legacy `src/admin/components/AdminX.jsx` paths for direct imports. New shared code should use canonical names.

## Adding A Component

1. Create the component file under `components/`.
2. Export it from `components/index.js`.
3. Add an admin alias when backward compatibility requires one.
4. Add the canonical export and alias to `admin/test/designSystemBarrel.test.js`.
5. Update `CRAWLER_MAP.md`.
