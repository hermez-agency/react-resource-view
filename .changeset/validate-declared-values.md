---
"react-resource-view": patch
---

La validation en dev vérifie les valeurs de `rowActions`, `open`, `afterSave`, `pageSize`, `permissions` et `layouts`, et signale une table déclarée sans `form`, au lieu de les laisser retomber en silence sur un défaut.
