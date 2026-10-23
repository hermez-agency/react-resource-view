---
"react-resource-view": patch
---

Fixed: in a list, the bulk action bar only appears in the layouts that have a selection (table, cards, items, tree, board, or a `layout.custom` that declares `supports: ["selection"]`); when switching to the calendar, the map… the selection is set aside instead of staying active on invisible rows.
