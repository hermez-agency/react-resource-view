---
"react-resource-view": patch
---

Fixed: the `migrate` codemod rewrites `tableViewOptionFactory()` without an argument to `layout.table()`, and a factory called with a variable to `layout.cards(opts)` flagged for a manual review, instead of crashing on a TypeError that does not name the file

A file the migration cannot read or rewrite is now named with its error and left as it is; the other files are processed anyway, and the command ends with code 1 — the project is no longer left half migrated without knowing where.
