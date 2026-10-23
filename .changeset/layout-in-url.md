---
"react-resource-view": patch
---

Changed: switching layouts writes `variant=<id>` into the URL, as `filter` does, instead of keeping it in memory only: a reload or a shared link finds the chosen layout again. A list nested in a tab leaves the URL alone.
