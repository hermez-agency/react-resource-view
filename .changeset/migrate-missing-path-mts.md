---
"react-resource-view": patch
---

Fixed: the `migrate` codemod exits with code 1 on a path that does not exist and processes `.mts`, `.cts` and `.cjs` files, instead of announcing "0 files rewritten." and letting `--check` pass in CI

Errors (unknown option, missing path, file that cannot be migrated) are written to stderr, no longer to stdout.
