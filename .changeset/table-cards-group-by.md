---
"react-resource-view": minor
---

Added: `layout.table({ groupBy })` and `layout.cards({ groupBy })` section the rows by a field, one foldable section per value with its count

- The sections are headed by the labels of the `options` of the form's select input, in its order; the records with no value are gathered under "No value", last.
- Each header is a button with `aria-expanded`; every section starts open.
- The Properties menu of the table gains a "Group by" choice among its select fields, remembered per resource and layout like the columns.
- Only the page on screen is grouped, and a note says so when the API holds more records.
