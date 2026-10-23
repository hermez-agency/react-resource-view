---
"react-resource-view": minor
---

Added: `views.list.savedViews: true` adds tabs of saved views above a list — a name over its filters, sort, layout and columns, created, renamed, duplicated and deleted by the reader — and `views.list.presets` declares typed ones in code, instead of a combination that cannot be named nor linked to

- A view has a URL: `?savedView=<id>` applies it, next to the `filter` and `variant` it sets.
- The views a reader saves are kept by the new `savedViews` port of `configurePorts`: `localStorage` by default, or four functions (`list`, `create`, `update`, `remove`) to share them through an API. `SavedViewsStoreInterface`, `SavedView`, `ListPreset` and `localSavedViewsStore` are exported.
- In development, a preset without a name, with an undeclared layout or with the id of another is refused.
