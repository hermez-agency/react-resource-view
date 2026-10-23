---
"react-resource-view": major
---

refactor: l'index ne réexporte plus les helpers internes ni les outils de test : ces noms ne s'importent plus depuis `react-resource-view`, leur code reste dans son module

Retirés de l'index, à viser avec la version 2.0.0 :

- `onResourceViewDefaultsChange` (marqué `@internal`) et `getRegisteredOpenFrames`
- `BUILT_IN_OPEN` et `resolveOpen`
- `adoptResources` et `useInlineClaim`
- `writeOptimistically`, `isOptimistic` et `notifyWriteError`
- `joinPath`, `appendBracketParam` et `flattenStrapiRecord`
- `PermissionCacheContext`
- `resetApiConfig`, pour les tests
- `Header` et `ContentList`, composants internes de la vue liste (noms qui entraient en collision avec ceux du routeur)

Aucun de ces noms n'est utilisé par la documentation ni par le site. Les déclarations `@internal` ne sortent plus dans les fichiers `.d.ts` publiés (`stripInternal`). Un test fige désormais la liste des exports publics : tout ajout ou retrait la fait changer.
