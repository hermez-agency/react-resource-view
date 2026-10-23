---
"react-resource-view": patch
---

Added: a resource can let a board's cards be moved without offering the update form (`permissions: { update: false, move: true }`), instead of locking the cards as soon as `update` is refused

The new `move` permission answers as `update` does as long as it is not declared: nothing changes for a resource that does not mention it. The `migrate` codemod puts a `TODO(RV1-PERM-008)` on `update` when `canUpdate` is refused on a declaration that draws a board — in 0.x, its cards moved anyway. Documented in `MIGRATION-1.0.md` and `migrations/1.0.json`.
