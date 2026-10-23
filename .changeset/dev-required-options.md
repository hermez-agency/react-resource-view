---
"react-resource-view": minor
---

En développement, un onglet sans `resource` ni `component` ou dont la resource est un id inconnu, un `layout.chart()` sans `groupBy` ni `dateField` et un `layout.cards({ columns })` hors de 1 à 6 lèvent une erreur explicite, au lieu de passer sans rien dire.
