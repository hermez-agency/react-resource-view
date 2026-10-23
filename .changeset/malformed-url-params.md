---
"react-resource-view": patch
---

fix(routes): un `?filter=` ou `?defaultData=` malformé dans l'URL est ignoré (avec un avertissement en dev) et la vue s'affiche, au lieu de lever une `SyntaxError` qui faisait tomber tout le `ResourceViewProvider`
