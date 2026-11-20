---
"react-resource-view": minor
---

Added: a "Shown fields" menu next to a list's filters hides and shows fields in every layout — table, cards, board, calendar, gallery, items, split — instead of only a table's columns, one table at a time

- `views.list.fields: { toggle, persist, hidden }`: the menu (on by default), where the choice is kept (`"local"` or `false`), and the fields hidden until the reader shows them.
- Fields are data keys, nested ones included: hiding `user` hides `user.name`; `user.email` can be hidden alone.
- `<Field name="price">…</Field>` and `useFieldVisible("price")` let a list component of your own follow the menu; `useFieldVisibility()` reads and changes the whole choice.
- The choice is kept per resource, shared by its layouts, through the new `fieldVisibility` port of `configurePorts` (`read`, `write`, optional `subscribe`): `localStorage` by default, SSR-safe, or an API.
- The table's "Properties" menu keeps the column order; the columns hidden there before are carried over to the new store the first time the list opens.
- Saved views and presets remember the fields hidden as `hiddenFields`; a view saved with `columns.hidden` still applies it.
