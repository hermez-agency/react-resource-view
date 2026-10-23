---
"react-resource-view": minor
---

Added: `singleton: { get }` or `singleton: { id }` declares a resource with a single record (settings, a profile): its menu entry opens `update` (or `read`) directly, and draws the creation form, pre-filled with `defaultData`, when the record does not exist, instead of a hand-made list filtered down to at most one item.

- `get(context)` resolves to the record, or to `undefined` / `null` when there is none; with `id`, a 404 from the API means the same.
- Saving a new record stays on the page and turns it into the editing form; `afterSave` still applies.
