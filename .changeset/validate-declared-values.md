---
"react-resource-view": patch
---

Changed: the development validation checks the values of `rowActions`, `open`, `afterSave`, `pageSize`, `permissions` and `layouts`, and reports a table declared without `form`, instead of letting them fall back silently on a default.
