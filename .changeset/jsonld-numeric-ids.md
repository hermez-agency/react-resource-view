---
"react-resource-view": patch
---

Fixed: the JSON-LD dialect returns ids as strings, so a custom repository answering `{ id: 5 }` no longer crashes `layout.split()` with `id.split is not a function`.
