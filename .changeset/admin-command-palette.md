---
"react-resource-view": minor
---

Added: `commandPalette` on `AdminLayout` / `createAdminLayout` opens a Cmd+K / Ctrl+K palette built from the scope — go to a menu entry, start a creation — and lists only what the resources permit, instead of leaving the back office without keyboard navigation.

- `commandPalette: { searchable: true }` also looks records up by the `titleField` of each resource, sent as a filter like the list's own.
- The palette is a `role="dialog"` holding a `combobox` and a `listbox`; Escape closes it.
