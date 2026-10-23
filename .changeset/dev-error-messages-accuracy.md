---
"react-resource-view": patch
---

Changed: a development error points to `MIGRATION-1.0.md` and `npx react-resource-view migrate` only when it reports a 0.x key, instead of ending every error — a typo in a 1.x declaration included — with it

- An option a layout names differently is suggested under its name there: `layout.timeline({ dateField })` suggests `startField` (and `layout.calendar({ startField })` suggests `dateField`), instead of the closest spelling, `titleField`.
- A misplaced `groupBy` lists `layout.chart({ groupBy })` among the layouts that take one.
- The hint for `titleKey` (RV1-VIEW-008) names the layouts that take a `titleField` — board, gallery, calendar, timeline, tree and map — instead of "on a layout", which `layout.table({ titleField })` refuses.
