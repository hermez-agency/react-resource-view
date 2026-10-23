---
"react-resource-view": patch
---

Fixed: the links of the row actions, the split, the timeline, the calendar and the chart carry the identifier read by the resource's dialect (Strapi's `documentId`, Supabase's primary key), instead of the global dialect's
