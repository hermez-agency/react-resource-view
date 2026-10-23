---
"react-resource-view": patch
---

Fixed: on a timeline, a `groupBy` field holding a number or a boolean (`0` and `false` included) forms one group per value, instead of putting every row in "Unassigned".
