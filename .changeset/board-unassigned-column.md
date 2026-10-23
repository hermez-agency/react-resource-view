---
"react-resource-view": patch
---

Fixed: on a board, records whose `groupBy` matches no column (null, unknown value) fall into a "No value" column (`showUnassigned`, `unassignedLabel`), and `1` finds the `"1"` column, instead of disappearing without a sign.
