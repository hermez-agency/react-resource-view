---
"react-resource-view": minor
---

Added: `layout.table({ virtualize })` draws only the rows on screen past 200 rows, instead of mounting every row of the page — a table of thousands of records opens, scrolls and restyles like one of fifty

- On by default above 200 rows; `virtualize: true` always, `virtualize: false` never, `{ threshold, overscan }` sets the number of rows and how many are drawn beyond each edge of the screen (8 by default).
- The table stays a `<table>`: the rows off screen are spacer rows of their measured height, the header and the pinned cells are untouched, and column widths are held while scrolling.
- Groups (folded or not) and views opened inline under a row are virtualized as one flat list.
- _Select all_ and bulk actions work on every record of the page, drawn or not; ↑ / ↓ and Ctrl+Home / Ctrl+End move to another row and scroll to it; the table carries `aria-rowcount` and each row its `aria-rowindex`.
- New dependency: `@tanstack/react-virtual`.
