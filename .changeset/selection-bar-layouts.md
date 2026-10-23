---
"react-resource-view": patch
---

Liste : la barre d'actions groupées n'apparaît plus que dans les layouts qui ont une sélection (table, cards, items, tree, board, ou un `layout.custom` qui déclare `supports: ["selection"]`) ; au passage au calendrier, à la carte… la sélection est mise de côté au lieu de rester active sur des lignes invisibles.
