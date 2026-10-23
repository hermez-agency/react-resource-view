---
"react-resource-view": minor
---

Added: `npx react-resource-view generate resources` writes one resource declaration per collection of the OpenAPI schema, instead of leaving every `createViewResource` to be written by hand after `init`

- Reads OpenAPI 3.0/3.1 and Swagger 2.0 (API Platform, FastAPI, Supabase…) from a file or a URL — by default `src/api-schema/openapi.json`.
- Writes the `path`, the `form.inputs` (enums as selects, IRIs and foreign keys as searchable relations, dates, numbers, booleans), the `permissions` the exposed operations allow, a table, and a board when an enum named `status` is among the inputs.
- Registers the resources in the scope's `resources`; `--only books,authors` restricts them, `--dry-run` lists the files, and no existing file is overwritten without `--force`.
