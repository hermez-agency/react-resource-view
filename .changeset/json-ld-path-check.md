---
"react-resource-view": patch
---

En dev, un `path` JSON-LD sans `/` initial lève une erreur au lieu de viser le mauvais hôte, et `realtime: true` sur un `path` hors `/api/` avertit qu'il ne s'abonne à rien, au lieu de rester muet.
