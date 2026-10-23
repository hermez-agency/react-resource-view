---
"react-resource-view": minor
---

Changed: a burst of realtime pushes is read once, 250 ms after the last one (`realtime: { debounce }` to change it), and a read that a newer one replaces, or that the unmount outlives, is aborted: `ResourceContext` carries a `signal` that the REST repository passes to `fetch`, instead of five full reads of the list whose stale answers were only dropped on arrival.
