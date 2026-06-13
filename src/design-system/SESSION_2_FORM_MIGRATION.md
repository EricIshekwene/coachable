# Session 2 Form-Control Migration

## Scope

Session 2 added the shared `Field` primitive, extended the canonical button and form
controls, and migrated all 12 files in `src/pages/app/` away from raw styled form
elements. Modal overlay shells and Session 3 display primitives were intentionally
left unchanged.

## Component Behavior

- `Field` owns labels, required indicators, hints, errors, and character counts.
- `Button` supports polymorphic links, loading, full-width layout, icons, and the
  `danger-outline` variant.
- `Input`, `Textarea`, and `Select` can self-wrap in `Field` when given a label.
- Unlabelled inputs and textareas remain native focusable elements so existing page
  layout classes and refs continue to target the control itself.
- Settings toggles and notification/playbook choice controls now use `Toggle`,
  `RadioGroup`, and `Checkbox`.

## Key Decisions

- Existing app control classes were retained where they encode page-specific layout,
  while semantic variants now define button color and interaction states.
- Loading buttons preserve their content width by hiding the content in place and
  overlaying a CSS-border spinner.
- Polymorphic disabled buttons prevent navigation and click handlers while exposing
  `aria-disabled`; native buttons additionally receive the `disabled` attribute.
- Existing modal shells, alert blocks, spinners outside buttons, cards, badges, and
  editor-adjacent code remain outside this migration.
