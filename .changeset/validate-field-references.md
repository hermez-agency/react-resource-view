---
"react-resource-view": patch
---

Changed: the development validation cross-checks `groupBy`, `fields`, `sort.fields` and `titleField` against `form.inputs`: `statuss` or `titel` give a "did you mean … ?" warning instead of passing silently (a warning, to let computed fields through).
