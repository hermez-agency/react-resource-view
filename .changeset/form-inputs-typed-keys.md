---
"react-resource-view": patch
---

Changed: the keys of `form.inputs` are checked against the item: `inputs: { titel }` is a TypeScript error, instead of compiling silently. A field that does not exist on the item (a password confirmation…) is declared in the second generic, `createViewResource<User, User & { confirm: string }>`; `filters.inputs` stays free, and the README says so.
