---
"react-resource-view": patch
---

`ApiUri` affiche un repli au lieu du loader infini quand la relation répond en erreur, `noCache` relit bien l'IRI même déjà en cache, un changement d'`iri` est pris en compte, et le cache est invalidé quand la ressource liée publie `onChange`.
