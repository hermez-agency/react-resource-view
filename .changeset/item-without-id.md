---
"react-resource-view": patch
---

fix(api): `createViewResource<Row>` accepte le type réel d'une ligne Supabase, Strapi, FastAPI, Django ou Spring, sans `"@id"`, au lieu de refuser le type ou de pousser à mentir dessus
