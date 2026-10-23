---
"react-resource-view": patch
---

Les noms de champs (`titleField`, `groupBy`, `form.inputs`…) sont vérifiés aussi sur un item qui étend `BaseJsonLdItemInterface`, au lieu d'accepter n'importe quelle chaîne à cause de sa signature d'index.
