---
"react-resource-view": minor
---

Changed: `layout.board({ groupBy: "status" })` draws one column per option of the form's `status` input, instead of asking for `columns` next to the `options` it already declares

- `columns` stays available to reorder the columns or show only some of them.
- In development, a board without `columns` is refused only when the input it groups by has no `options` to read them from.
