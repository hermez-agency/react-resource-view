---
"react-resource-view": patch
---

Fixed: a custom dialect that reads `payload.rows` fills the list, instead of showing it empty because it read the already normalized envelope again
