---
"react-resource-view": minor
---

Added: `npx react-resource-view generate --hydra <url>` declares the resources of an API Platform API from its Hydra documentation (`/docs.jsonld`), instead of writing each one by hand

- One file per class the API's entrypoint lists, with its `path`, an input per property and a table. The URL may also be the root of the API, or a local file.
- Property types pick the control: strings, numbers (`xsd:integer`, `xsd:decimal`), booleans as a switch, dates and date-times as a date picker, and relations as a search select (a multiple one for a to-many relation) searching the related resource.
- Read-only properties are left out of the form, and the operations a class exposes become the resource's `permissions`.
- Files are registered in the scope and never overwritten without `--force`, like `generate resources`.
