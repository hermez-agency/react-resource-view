---
title: "React Resource View 2.1 : des tableaux virtualisés et des fenêtres qui s'ouvrent sans figer la page"
description: "La version 2.1 de React Resource View ne monte que les lignes visibles d'un tableau au-delà de 200 lignes, et retire les sélecteurs CSS qui faisaient restyler toute la page à chaque ouverture de fenêtre. Chiffres mesurés et mode d'emploi."
date: 2026-11-19
tags:
  - Nouveautés
  - React
  - Performance
  - TypeScript
---

La version 2.1.0 de React Resource View est publiée sur npm. Elle ne change rien à la façon de déclarer une ressource : elle rend plus rapides deux choses que l'on remarque dès que les données grossissent, un tableau de plusieurs milliers de lignes et l'ouverture d'une fenêtre sur une grande page. Aucune migration n'est nécessaire.

## Un tableau qui ne dessine que ce qui est à l'écran

Jusqu'ici, `layout.table()` montait une ligne de DOM par enregistrement de la page. À quelques centaines de lignes, on ne le voyait pas ; à quelques milliers, l'ouverture de la liste, le défilement et chaque changement d'état en payaient le prix.

Avec la 2.1, au-delà de 200 lignes, le tableau ne dessine plus que les lignes visibles, plus quelques-unes de part et d'autre de l'écran. Le reste est remplacé par deux lignes d'espacement à la hauteur mesurée des lignes absentes, de sorte que la barre de défilement garde sa taille et sa position.

Mesuré sur une page de 2 000 lignes, dans jsdom (le simulateur de navigateur des tests, pas un vrai navigateur) :

| | Avant | Après |
| --- | --- | --- |
| Nœuds DOM montés | 64 044 | 782 |
| Temps de montage | environ 14,7 s | environ 0,2 à 0,35 s |

Ces chiffres viennent d'un test, pas d'un profil de navigateur : ils disent combien de travail disparaît, pas le temps exact que vous gagnerez sur votre machine.

### Ce qui ne change pas

Le tableau reste un vrai `<table>` : l'en-tête et les cellules épinglées ne bougent pas, et la largeur des colonnes est conservée pendant le défilement. Les groupes (repliés ou non) et les vues ouvertes sous une ligne sont virtualisés comme une seule liste à plat.

Ce qui touche aux données ne dépend pas de ce qui est dessiné : « Tout sélectionner » et les actions groupées portent sur tous les enregistrements de la page, visibles ou non. Au clavier, `↑` / `↓` et `Ctrl+Début` / `Ctrl+Fin` changent de ligne et font défiler jusqu'à elle. Le tableau porte `aria-rowcount` et chaque ligne `aria-rowindex`, pour que les lecteurs d'écran annoncent la bonne position dans la liste complète.

## Comment l'activer

Il n'y a rien à faire : la virtualisation est active par défaut au-delà de 200 lignes. Pour la régler :

```ts
layout.table({ virtualize: false }) // toutes les lignes, toujours
layout.table({ virtualize: true }) // seulement celles à l'écran, toujours
layout.table({ virtualize: { threshold: 500, overscan: 4 } })
```

`threshold` est le nombre de lignes à partir duquel la virtualisation s'applique, et `overscan` le nombre de lignes dessinées au-delà de chaque bord de l'écran (8 par défaut). La mise à jour ajoute une dépendance, `@tanstack/react-virtual`, installée avec le paquet.

## Des fenêtres qui n'obligent plus le navigateur à tout restyler

Le second changement est un correctif de performance. Certains composants (champ, case à cocher, élément de liste, boîte de dialogue de confirmation, groupe de boutons) produisaient des sélecteurs CSS de la forme `:has()` placé avant l'élément stylé, ou `~` entre deux éléments quelconques. Sur une page de plusieurs dizaines de milliers de nœuds, Chrome devait alors recalculer les styles de toute la page : des centaines de millisecondes à chaque ouverture ou fermeture d'une fenêtre.

Ces règles sont désormais écrites autrement : une classe comme sujet, le `:has()` sur l'élément stylé lui-même, ou `:nth-child(n + 2 of [data-slot])`. Les composants s'affichent de la même façon, avec la même spécificité ou plus. Un test construit la feuille de style avec le scanner de Tailwind et échoue si l'une de ces formes revient.

Si votre application scanne `react-resource-view/dist` avec `@source` et contournait le problème avec `@source not inline(…)`, vous pouvez retirer ce contournement.

## Mettre à jour

```bash
npm i react-resource-view@latest
```

La liste complète est dans le [journal des changements](https://github.com/hermez-agency/react-resource-view/blob/main/CHANGELOG.md). L'option `virtualize` est détaillée dans la [documentation des affichages](/docs/resource-view/layouts/), et le code est sur [GitHub](https://github.com/hermez-agency/react-resource-view), sous licence MIT.

*A Hermez product*
