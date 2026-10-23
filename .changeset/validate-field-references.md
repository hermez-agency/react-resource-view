---
"react-resource-view": patch
---

La validation en dev recoupe `groupBy`, `fields`, `sort.fields` et `titleField` avec `form.inputs` : `statuss` ou `titel` donnent un warning « did you mean … ? » au lieu de passer sans rien dire (un warning, pour laisser passer les champs calculés).
