---
"react-resource-view": patch
---

Changed: list rows (table, cards, items, split) are keyed by the identity of their record instead of `JSON.stringify` or the index, so an edited or optimistically created row keeps its DOM node, focus and local state.
