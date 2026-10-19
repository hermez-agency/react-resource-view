---
"react-resource-view": minor
---

feat(views): the table's columns are shown, hidden and reordered from a "Properties" menu, as in Notion, without touching the declaration

- A box per column shows or hides it, a handle drags it elsewhere (Alt + ↑ / ↓ from the keyboard); the table keeps one column at least.
- The choice is kept in `localStorage`, per resource and per layout (`react-resource-view:columns:<resource>:<layout>`). The declaration stays the default: "Reset to default" forgets the choice, and a field added to the form later appears where it is declared.
