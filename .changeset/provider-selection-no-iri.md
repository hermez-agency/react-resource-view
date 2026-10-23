---
"react-resource-view": patch
---

Fixed: `setSelected`, `isSelected` and `onSelected` select a record by the identity the dialect reads, instead of accepting only those that have an `@id` (Strapi, Supabase, FastAPI, Django, Spring)
