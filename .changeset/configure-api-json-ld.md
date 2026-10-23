---
"react-resource-view": patch
---

fix(api): `baseUrl`, `fetch` et `getHeaders` de `configureApi` s'appliquent aussi au dialecte JSON-LD par défaut, et `baseUrl` et `getAuthToken` atteignent Mercure, au lieu d'être ignorés
