---
"react-resource-view": minor
---

Changed: the command palette (Cmd+K / Ctrl+K) of `AdminLayout` and `createAdminLayout` is on by default, instead of staying off until `commandPalette` is set

- Without the option, the palette opens and lists the menu's resources and the creations they permit, without searching records. `commandPalette: { searchable: true }` also searches records.
- `commandPalette: false` turns it off, for an application that uses Cmd+K / Ctrl+K for something else.
