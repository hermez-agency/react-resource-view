---
"react-resource-view": patch
---

Fixed: `createViewResource<Row>` accepts the real type of a Supabase, Strapi, FastAPI, Django or Spring row, without `"@id"`, instead of refusing the type or pushing to lie about it
