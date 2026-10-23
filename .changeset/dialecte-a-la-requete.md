---
"react-resource-view": patch
---

fix(api): une ressource déclarée avant `configureApi({ dialect })` parle le dialecte configuré, au lieu de rester en JSON-LD pour toujours

`createRepository` choisissait entre le repository JSON-LD et le repository REST au moment où la ressource était déclarée. Les ressources étant déclarées par des modules importés, donc avant le corps du point d'entrée qui appelle `configureApi`, une application Strapi ou Supabase répartie en plusieurs fichiers parlait JSON-LD sans rien signaler. Le choix se fait maintenant à chaque requête ; une ressource qui déclare son propre `dialect` garde son backend.
