---
title: "React Resource View 2.2 : un menu « Champs affichés » pour toutes les listes de votre back-office React"
description: "La version 2.2 de React Resource View ajoute à chaque liste de votre back-office React et TypeScript un menu pour masquer des champs dans le tableau, les cartes, le board ou le calendrier, avec un état conservé par ressource, que vous pouvez stocker dans votre API."
date: 2026-11-26
lang: fr
translation: rrv-2-2-visible-fields
tags:
  - Nouveautés
  - React
  - Back-office
  - TypeScript
---

La version 2.2.0 de React Resource View est publiée sur npm. Elle règle un irritant que l'on rencontre dans tout back-office React : une ressource a quinze champs, personne n'en lit plus de cinq, et chacun voudrait ne voir que les siens. Désormais, le lecteur choisit lui-même ce que la liste affiche, dans n'importe quel affichage, sans que vous écriviez de code. Aucune migration n'est nécessaire.

## Avant : des colonnes masquables, mais seulement dans le tableau

Jusqu'à la 2.1, le tableau avait un menu « Propriétés » qui masquait des colonnes. C'était pratique, mais limité à `layout.table()` : si votre liste proposait aussi des cartes, un board ou un calendrier, ces affichages montraient tous les champs, quoi qu'ait choisi le lecteur. Et la préférence se perdait d'un affichage à l'autre.

## Après : un menu à côté des filtres, valable partout

Avec la 2.2, un menu « Champs affichés » apparaît à côté des filtres de chaque liste, avec une case par champ déclaré. Décochez un champ : il disparaît du tableau, des cartes, du board, du calendrier, de la galerie, des éléments et du split. La même préférence s'applique aux sept affichages, parce qu'elle est gardée par ressource et non par affichage.

Le menu est actif par défaut. Pour une ressource existante, il n'y a donc rien à changer : mettez à jour le paquet et il est là. Pour le régler, tout passe par `views.list.fields` :

```ts
import { createViewResource, layout } from "react-resource-view"

export const tasks = createViewResource<Task>("tasks", {
  name: "Tasks",
  path: "/api/tasks",
  form: { inputs: TASK_FIELDS },
  views: {
    list: {
      layouts: [layout.table(), layout.board({ groupBy: "status" })],
      fields: {
        toggle: true, // le menu « Champs affichés » : actif par défaut
        persist: "local", // où garder le choix ; false : jusqu'à la sortie de la liste
        hidden: ["notes", "user.email"], // masqués tant que le lecteur ne les affiche pas
      },
    },
  },
})
```

Les trois options :

- `toggle` : afficher ou non le menu. `false` le retire, pour une liste dont les champs sont fixes.
- `persist` : `"local"` (par défaut) garde le choix dans le navigateur ; `false` le garde seulement tant que la liste reste ouverte.
- `hidden` : les champs masqués au premier affichage. C'est la déclaration qui fixe le point de départ ; le lecteur peut les montrer, et son choix l'emporte ensuite.

### Des champs imbriqués, au niveau près

Un champ est une clé de donnée, les clés imbriquées s'écrivent avec des points. Masquer `user` masque tout ce qui est dessous ; masquer `user.email` seul garde `user.name`. Dans le tableau, l'ordre des colonnes reste celui du menu « Propriétés », qui continue de le gérer.

## Vos propres composants suivent le menu

Si votre liste utilise un composant de ligne écrit à la main, il ne sait pas, de lui-même, quels champs sont masqués. Deux outils le lui disent. `<Field name="…">` ne dessine rien tant que le champ est masqué, et `useFieldVisible("…")` renvoie un booléen quand la mise en page en dépend :

```tsx
import { Field, useFieldVisible } from "react-resource-view"
import type { RowComponentPropsInterface } from "react-resource-view"

function TaskCard({ row }: RowComponentPropsInterface<Task>) {
  const showsPrice = useFieldVisible("price")
  if (!row) return null
  return (
    <article className={showsPrice ? "grid grid-cols-2" : ""}>
      <Field name="user.name">{row.data.user.name}</Field>
      <Field name="price">{row.data.price} €</Field>
    </article>
  )
}
```

`useFieldVisibility()` lit et modifie l'ensemble du choix, si vous voulez fabriquer votre propre commande à la place du menu.

## Garder le choix dans votre API plutôt que dans le navigateur

Par défaut, le choix de chaque lecteur est écrit dans le `localStorage`, une entrée par ressource, sans erreur en rendu serveur. Pour que la préférence suive la personne d'un poste à l'autre, la 2.2 ajoute un port `fieldVisibility` à `configurePorts`, avec la même idée que le port des vues enregistrées : `read` et `write`, éventuellement asynchrones, et un `subscribe` optionnel pour réagir à un changement venu d'ailleurs.

```ts
import { configurePorts } from "react-resource-view"

configurePorts({
  fieldVisibility: {
    read: (resource) =>
      fetch(`/api/field-visibility/${resource}`).then((r) => (r.ok ? r.json() : null)),
    write: (resource, state) =>
      // state : { hidden: string[], shown: string[] }, ou null pour revenir à la déclaration
      fetch(`/api/field-visibility/${resource}`, {
        method: state ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: state ? JSON.stringify(state) : undefined,
      }).then(() => undefined),
  },
})
```

L'état est volontairement petit : `hidden` pour ce que le lecteur a masqué, `shown` pour ce qu'il a montré parmi les champs masqués par défaut. Tant que rien n'est stocké (`null`), c'est la déclaration qui s'applique.

### Ce qui se passe pour l'existant

- Les colonnes masquées dans un tableau avant la 2.2 sont reprises dans le nouveau stockage à la première ouverture de la liste : personne ne retrouve toutes ses colonnes.
- Les vues enregistrées et les préréglages se souviennent des champs masqués dans une clé `hiddenFields`. Une vue enregistrée avec l'ancien `columns.hidden` l'applique toujours.

## Ce qui est déjà fusionné, pas encore publié

Trois changements sont sur la branche principale, avec leur changeset, mais ne sont pas dans la 2.2.0 : ne comptez dessus qu'après la prochaine publication.

- **`layout.feed()`** affiche un journal d'activité : les enregistrements deviennent des événements datés, regroupés par jour sous « Aujourd'hui », « Hier » puis la date, le long d'un fil vertical. Les filtres, la recherche, les vues enregistrées et la pagination fonctionnent comme sur les autres affichages.
- **La palette de commandes `Cmd+K` / `Ctrl+K`** de `AdminLayout` sera active par défaut. `commandPalette: false` la désactive pour une application qui utilise déjà ce raccourci.
- **Les contrôles de développement** de `createViewResource` et `layout.*` ne tourneront plus dans un build de production, au lieu de pouvoir y laisser l'application sur son écran d'erreur.

## Mettre à jour

```bash
npm i react-resource-view@latest
```

Le menu est présent dès la première ouverture d'une liste. Si vous ne voulez pas l'offrir sur une ressource, `fields: { toggle: false }` suffit.

Pour un premier projet, suivez le [démarrage rapide](/docs/resource-view/quickstart/) ; l'installation se résume à `npm i react-resource-view`, détaillée dans l'[installation](/docs/resource-view/installation/). Les affichages cités ici sont décrits dans la [documentation des affichages](/docs/resource-view/layouts/), et la liste complète des changements est dans le [journal](https://github.com/hermez-agency/react-resource-view/blob/main/CHANGELOG.md). Le code est sur [GitHub](https://github.com/hermez-agency/react-resource-view), sous licence MIT.

*A Hermez product*
