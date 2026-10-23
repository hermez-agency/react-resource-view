---
"react-resource-view": patch
---

Fixed: a resource declared before `configureApi({ dialect })` speaks the configured dialect, instead of staying on JSON-LD forever

`createRepository` chose between the JSON-LD repository and the REST repository when the resource was declared. Resources being declared by imported modules, hence before the body of the entry point that calls `configureApi`, a Strapi or Supabase application split across several files spoke JSON-LD without a word. The choice is now made on every request; a resource that declares its own `dialect` keeps its backend.
