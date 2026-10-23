---
"react-resource-view": patch
---

Board : les enregistrements dont le `groupBy` ne correspond à aucune colonne (null, valeur inconnue) tombent dans une colonne « No value » (`showUnassigned`, `unassignedLabel`), et `1` retrouve la colonne `"1"`, au lieu de disparaître sans signal.
