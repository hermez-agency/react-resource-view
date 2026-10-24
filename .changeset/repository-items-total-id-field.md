---
"react-resource-view": minor
---

Changed: a hand-written `repository` answers `{ items, totalItems }` and always receives `{ id: string }`, instead of a JSON-LD collection and an id that was sometimes the item, the IRI or the bare segment

- `getCollection` accepts `{ data: { items, totalItems, nextCursor? } }` without a cast; `createResourceCollection` and JSON-LD collections still work.
- `getItem` and `removeItem` receive `{ id }` and `updateItem` the record with its `id`, always the short identifier as a string. A repository that read the `@id` of the item it was given must read `id` instead.
- New `idField` on the resource: links, keys and selection are built from that field, so the records need no `@id`.
