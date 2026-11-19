---
title: "React Resource View 2.0 : palette Cmd+K, vues enregistrées, board et génération depuis OpenAPI"
description: "Ce que la version 2.0 de React Resource View change pour votre back-office React et TypeScript : palette de commandes, vues enregistrées, board sans colonnes à déclarer, pages sans données, ressource unique et génération des ressources depuis OpenAPI."
date: 2026-11-19
tags:
  - Nouveautés
  - React
  - Back-office
  - TypeScript
---

La version 2.0.0 de React Resource View est publiée sur npm. Elle regroupe les ajouts faits depuis la 1.0 pour construire un back-office ou un CRUD React en TypeScript à partir d'une seule déclaration de ressource, et elle retire de l'index quelques noms internes. Voici ce que cela change pour quelqu'un qui l'utilise, avec du code avant / après quand l'API bouge.

## Le seul changement cassant : un index plus petit

Le numéro de version majeur vient d'un seul point. L'index de `react-resource-view` ne réexporte plus les aides internes ni les outils de test : `onResourceViewDefaultsChange`, `getRegisteredOpenFrames`, `BUILT_IN_OPEN`, `resolveOpen`, `adoptResources`, `useInlineClaim`, `writeOptimistically`, `isOptimistic`, `notifyWriteError`, `joinPath`, `appendBracketParam`, `flattenStrapiRecord`, `PermissionCacheContext`, `resetApiConfig`, ainsi que les composants `Header` et `ContentList` de la vue liste (dont les noms entraient en collision avec ceux du routeur).

Si vous n'importez que `createViewResource`, `layout`, `createScope` et leurs voisins documentés, vous n'avez rien à faire. Les déclarations marquées `@internal` disparaissent aussi des fichiers `.d.ts` publiés, et un test fige désormais la liste des exports publics : toute addition ou suppression future se verra dans la revue.

## Une palette de commandes Cmd+K

Avec `commandPalette` sur `AdminLayout` ou `createAdminLayout`, `Cmd+K` (ou `Ctrl+K`) ouvre une palette construite à partir du scope : aller à une entrée de menu, démarrer une création. Elle ne liste que ce que les permissions de vos ressources autorisent.

```tsx
decoratorComponent: createAdminLayout({
  commandPalette: { searchable: true },
})
```

Avec `searchable: true`, la palette cherche aussi des enregistrements, à partir du `titleField` de chaque ressource, envoyé comme un filtre de la liste. La palette est un `dialog` qui contient un `combobox` et un `listbox` ; `Échap` la ferme. Avant, un back-office n'offrait aucune navigation au clavier.

## Des vues enregistrées, comme dans Notion

Une combinaison de filtres, de tri, d'affichage et de colonnes qu'on ne peut ni nommer ni partager par un lien, c'est un manque. `views.list.savedViews: true` ajoute au-dessus de la liste des onglets de vues enregistrées : le lecteur les crée, les renomme, les duplique et les supprime.

```ts
views: {
  list: {
    savedViews: true,
    presets: [
      { id: "mine", name: "À faire", filter: { status: "todo" } },
    ],
  },
}
```

Chaque vue a une adresse : `?savedView=<id>` l'applique. Les vues enregistrées par un lecteur vont dans `localStorage` par défaut ; le port `savedViews` de `configurePorts` accepte quatre fonctions (`list`, `create`, `update`, `remove`) pour les partager par votre API. En développement, un preset sans nom, avec un affichage non déclaré ou avec l'identifiant d'un autre est refusé.

## Un board qui lit ses colonnes dans le formulaire

Avant, un board demandait `columns` à côté des `options` que le formulaire déclarait déjà pour le même champ. Maintenant, une colonne par option suffit :

```ts
// avant
layout.board({
  groupBy: "status",
  columns: [
    { value: "todo", label: "À faire" },
    { value: "done", label: "Terminé" },
  ],
})

// après : une colonne par option du champ `status`
layout.board({ groupBy: "status" })
```

`columns` reste disponible pour réordonner ou ne montrer que certaines colonnes, et accepte désormais une fonction relue à chaque rendu. `hideEmpty` masque les colonnes sans carte, sauf pendant qu'une carte est déplacée. Les enregistrements dont la valeur ne correspond à aucune colonne tombent dans une colonne « Sans valeur » au lieu de disparaître. Une ressource peut aussi laisser déplacer les cartes sans offrir le formulaire d'édition : `permissions: { update: false, move: true }`.

## De nouveaux affichages et un groupement

La liste gagne `layout.gallery({ imageField })`, une grille de cartes à image pour des produits, des articles ou des profils, ainsi que `layout.tree()`, `layout.map()` et `layout.chart()`. `layout.table({ groupBy })` et `layout.cards({ groupBy })` découpent les lignes par champ, en sections repliables avec leur compte. Tout reste indépendant de l'API : l'utilisateur passe de l'un à l'autre depuis le sélecteur de la liste.

## Des pages sans données et des ressources uniques

Une page d'accueil, une aide ou un tableau de bord n'ont pas besoin d'une ressource avec toutes les permissions coupées et un faux `getCollection`. `createPage` déclare une entrée de menu et une route vers un composant, sans appel à l'API :

```tsx
import { createPage } from "react-resource-view"
import { LifeBuoy } from "lucide-react"

export const help = createPage("help", {
  name: "Help",
  icon: LifeBuoy,
  component: HelpPage,
})
```

Pour un réglage ou un profil qui n'a qu'un enregistrement, `singleton: { get }` ou `singleton: { id }` ouvre directement l'édition depuis le menu, et affiche le formulaire de création, prérempli avec `defaultData`, quand l'enregistrement n'existe pas encore.

## Générer les ressources depuis OpenAPI

Après `init`, il restait à écrire chaque `createViewResource` à la main. La commande suivante lit un schéma OpenAPI 3.0 / 3.1 ou Swagger 2.0 (API Platform, FastAPI, Supabase…) depuis un fichier ou une URL :

```bash
npx react-resource-view generate resources
npx react-resource-view generate resources --only books,authors --dry-run
```

Elle écrit une déclaration par collection, avec le `path`, les `form.inputs` (énumérations en listes, IRI et clés étrangères en relations avec recherche, dates, nombres, booléens), les `permissions` selon les opérations exposées et un tableau, plus un board si un champ énuméré s'appelle `status`. Les ressources sont ajoutées au `resources` du scope ; aucun fichier existant n'est écrasé sans `--force`.

## Brancher une API REST ordinaire

`restDialect` décrit une API REST courante par la configuration (`X-Total-Count`, en-tête `Link`, pagination par curseur), avec les préréglages `jsonServerDialect` et `drfCursorDialect`, et `init -b json-server` pour démarrer. Un repository écrit à la main répond maintenant `{ items, totalItems }` et reçoit toujours `{ id: string }`. Si le vôtre lisait l'`@id` de l'objet reçu, il doit lire `id`. Le nouveau champ `idField` indique d'où viennent les liens et les clés : vos enregistrements n'ont plus besoin d'`@id`.

## Et aussi

- les contrôles `createMediaImageInput` et `createMediaFilesInput` gardent une image ou des documents en base64 dans l'enregistrement, sans API d'envoi ;
- `react-resource-view/i18n` exporte `messages` et `missingKeys(dictionary)`, pour faire échouer un test quand une version ajoute un message que votre dictionnaire ne traduit pas ;
- `inspectDefinition` liste les problèmes d'une déclaration sans lever d'erreur, pratique en CI ;
- les listes vides distinguent « rien encore » de « rien ne correspond », et le temps réel regroupe une rafale de notifications en une seule lecture ;
- plusieurs corrections : le dialecte JSON-LD lit `hydra:violations`, `ApiUri` n'attend plus indéfiniment après une erreur, et le calendrier se commande au clavier.

## Mettre à jour

```bash
npm i react-resource-view@latest
```

La liste complète est dans le [journal des changements](https://github.com/hermez-agency/react-resource-view/blob/main/CHANGELOG.md). Pour un premier projet, suivez le [démarrage rapide](/docs/resource-view/quickstart/) ; pour aller plus loin, la [documentation](/docs/resource-view/quickstart/) détaille chaque option citée ici. Le code est sur [GitHub](https://github.com/hermez-agency/react-resource-view), sous licence MIT.

*A Hermez product*
