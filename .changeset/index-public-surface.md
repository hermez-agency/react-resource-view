---
"react-resource-view": major
---

Breaking: the index no longer re-exports the internal helpers nor the testing tools: these names can no longer be imported from `react-resource-view`, their code stays in its module

Removed from the index, to be released with version 2.0.0:

- `onResourceViewDefaultsChange` (marked `@internal`) and `getRegisteredOpenFrames`
- `BUILT_IN_OPEN` and `resolveOpen`
- `adoptResources` and `useInlineClaim`
- `writeOptimistically`, `isOptimistic` and `notifyWriteError`
- `joinPath`, `appendBracketParam` and `flattenStrapiRecord`
- `PermissionCacheContext`
- `resetApiConfig`, for tests
- `Header` and `ContentList`, internal components of the list view (names that collided with the router's)

None of these names is used by the documentation or the website. `@internal` declarations no longer appear in the published `.d.ts` files (`stripInternal`). A test now freezes the list of public exports: any addition or removal changes it.
