---
"react-resource-view": patch
---

Fixed: `hooks.beforeList` receives the view's filter already merged and has the last word, instead of seeing the filter added after it returned (a `search` renamed to `q` went out with both keys, a removed key came back)
