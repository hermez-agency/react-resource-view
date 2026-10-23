---
"react-resource-view": patch
---

Fixed: the JSON-LD dialect reads `hydra:title`, `hydra:description` and `hydra:violations` (API Platform 3's default error format), instead of showing a 400 error with no explanation.
