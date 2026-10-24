---
"react-resource-view": patch
---

Fixed: with FastAPI, Django or Spring and a primary key other than `id`, opening a record calls `GET /articles/hello`, instead of the collection's URL
