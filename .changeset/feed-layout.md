---
"react-resource-view": minor
---

Added: `layout.feed()`, a journal or activity feed — the records as dated events, gathered by day under "Today", "Yesterday" and the date, along a vertical thread

- Options: `dateField` (defaults to `"createdAt"`), `titleField`, `descriptionField`, `actorField` with its `avatarField`, `typeField` with a `types` table of icons and colours, and `order` (the most recent first by default).
- Each event shows its relative time with the full date as a tooltip and for screen readers, and its title is the link opening the record's `read` view (`update` when `read` is not permitted). Filters, search, saved views and pagination work as on the other layouts.
- Exports `ListFeed`, `FeedLayoutOptions` and `FeedTypeStyle`.
