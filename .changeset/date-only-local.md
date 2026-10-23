---
"react-resource-view": patch
---

Fixed: in the calendar and the timeline, a date without a time (`2026-10-23`) falls on the right day in every time zone and is shown without a time, instead of being read as UTC ("02:00", or the day before in the Americas)
