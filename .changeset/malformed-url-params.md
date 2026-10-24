---
"react-resource-view": patch
---

Fixed: a malformed `?filter=` or `?defaultData=` in the URL is ignored (with a warning in development) and the view is shown, instead of throwing a `SyntaxError` that brought down the whole `ResourceViewProvider`
