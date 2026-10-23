---
"react-resource-view": patch
---

Fixed: a view refuses an identifier from its URL that is the IRI of another resource or an absolute URL, and shows a load error, instead of reading — and saving — whatever the IRI designates (`/books/update/%2Fapi%2Fusers%2F1` called `GET /api/users/1`)

- An identifier holding a slash is accepted only as an IRI one segment under the resource's `path`.
- The JSON-LD dialect no longer calls an absolute URL given as an id, which would have sent the bearer token to that host.
