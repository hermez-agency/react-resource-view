---
"react-resource-view": minor
---

feat(views): the list's export button offers CSV and JSON and reads every page itself, instead of downloading a server CSV

- The rows are read page by page through the resource's repository, with the list's current filters and sort, so the export works on any dialect — Strapi and local storage included — and the button shows how many rows have been read so far.
- Only the columns the table shows are exported. CSV cells holding commas, quotes or line breaks are quoted, and the file opens in Excel with its accents intact; JSON keeps the raw values.
- `dialect.exportRequest` is no longer used by the button.
