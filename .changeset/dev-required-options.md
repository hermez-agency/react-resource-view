---
"react-resource-view": minor
---

Changed: in development, a tab with neither `resource` nor `component` or whose resource is an unknown id, a `layout.chart()` with neither `groupBy` nor `dateField` and a `layout.cards({ columns })` outside 1 to 6 throw an explicit error, instead of passing silently.
