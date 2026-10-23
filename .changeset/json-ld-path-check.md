---
"react-resource-view": patch
---

Changed: in development, a JSON-LD `path` without a leading `/` throws an error instead of targeting the wrong host, and `realtime: true` on a `path` outside `/api/` warns that it subscribes to nothing, instead of staying silent.
