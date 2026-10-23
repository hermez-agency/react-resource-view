---
"react-resource-view": minor
---

Changed: `afterSave: "read"` on `views.create` and `views.update` leads to the page of the saved record, and `useFormByResource` fills the form itself when the record arrives, instead of a view copying the synchronisation of `EditView`

- `"read"` is accepted by the development validation next to `"close"`, `"stay"` and `"reload"`.
- A form handed a `data` of its own (a row of a list) keeps that record and is not refilled.
