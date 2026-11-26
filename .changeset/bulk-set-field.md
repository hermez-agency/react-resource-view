---
"react-resource-view": minor
---

Added: `{ field }` in `views.list.bulkActions`, which sets one field of every selected record to a value picked from the options of its select input, instead of a hand-written `BulkActionInterface`

- One update per record, one after the other, through the repository's update (a PATCH on the usual dialects); records `permissions.update` refuses are left alone.
- The bar says how many records were updated and how many failed. A field with no select options draws no button.
- The grouped delete now says how many records were deleted and how many could not be, instead of only the failures.
- Exports the `SetFieldBulkAction` type.
