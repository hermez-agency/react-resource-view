---
"react-resource-view": patch
---

fix(provider): `setSelected`, `isSelected` et `onSelected` sélectionnent un enregistrement par l'identité que lit le dialecte, au lieu de n'accepter que ceux qui ont un `@id` (Strapi, Supabase, FastAPI, Django, Spring)
