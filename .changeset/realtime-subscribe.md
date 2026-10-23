---
"react-resource-view": minor
---

`realtime` accepte `{ subscribe, withCredentials }` : le canal se branche (Supabase Realtime, SSE, WebSockets), Mercure se reconnecte avec un délai croissant et relit les vues au retour du hub, au lieu de se fermer pour toujours après une erreur HTTP.
