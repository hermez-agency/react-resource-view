---
title: "Un back-office complet à partir de vos ressources : React Resource View en 10 minutes"
description: "Déclarez une ressource une seule fois et obtenez la liste, la fiche, la création, l'édition et la suppression de votre API REST, avec un filtre et plusieurs façons d'afficher les mêmes lignes."
date: 2026-11-13
tags:
  - Tutoriel
  - React
  - Back-office
---

Un back-office, c'est toujours la même histoire : une table, un formulaire pour créer, le même formulaire pour modifier, un bouton supprimer, quelques filtres. On l'écrit pour la première ressource, puis on recopie pour la deuxième, la troisième, la dixième.

React Resource View prend le problème par l'autre bout : **vous déclarez la ressource une fois**, et la bibliothèque construit les cinq écrans CRUD à partir de cette déclaration. Voici comment, en dix minutes, avec une API REST existante.

## Ce qu'on construit

Une application React qui parle à une API et propose, pour une ressource `articles` :

- une **liste** paginée, avec filtre ;
- une **fiche** de détail ;
- un formulaire de **création** et un d'**édition** ;
- une **suppression** avec confirmation.

La liste s'affiche en tableau ou en cartes, et l'utilisateur passe de l'un à l'autre à la volée, comme dans une base Notion.

## 1. Un projet branché sur votre API

Le plus court est de laisser le starter écrire l'application autour de votre API :

```bash
npx react-resource-view init my-admin
cd my-admin
npm install
npm run dev
```

La commande demande à quelle API vous parlez (API Platform, Spring Boot, Supabase, Strapi, FastAPI, Django ou n'importe quelle API REST) et où elle tourne. Vous obtenez un back-office sur `http://localhost:5173`, avec son menu et une ressource d'exemple.

Si vous avez déjà une application, ajoutez simplement le paquet :

```bash
pnpm add react-resource-view react-data-form react-mini-i18n resource-registry
```

Puis configurez l'accès à l'API, une seule fois, avant le premier rendu :

```ts
import { configureApi, configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

configurePorts({ navigation: tanstackAdapter })
configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => localStorage.getItem("token") ?? undefined,
})
```

Par défaut, la bibliothèque parle JSON-LD et Hydra, le format d'API Platform. Pour une autre API, on change de *dialecte* sans toucher à la déclaration de la ressource.

## 2. Déclarer la ressource

Une déclaration dit où vit la ressource sur l'API et quels champs elle porte. Ces champs sont à la fois le formulaire de création et d'édition **et** les colonnes du tableau :

```ts
import { createViewResource } from "react-resource-view"

export const articles = createViewResource("articles", {
  name: "Articles",
  path: "/api/articles",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
    },
  },
})
```

Le nom sert à dériver les titres des pages (« Articles », « Edit — Articles »…). Tout est autorisé par défaut ; une clé `permissions` restreint ce qui doit l'être.

## 3. Afficher la liste

Il ne reste qu'à rendre la ressource :

```tsx
import { ActionList } from "react-data-form"
import { ViewResourceContextProvider } from "react-resource-view"

export function ArticlesPage() {
  return (
    <ViewResourceContextProvider
      resource={articles}
      resourceAction={ActionList.list}
    />
  )
}
```

Vous voyez un tableau avec une ligne par enregistrement renvoyé par l'API, une pagination, un bouton pour créer, et sur chaque ligne les actions modifier et supprimer. Les cinq écrans viennent de la même déclaration.

## 4. Ajouter un filtre

La barre de filtres est un formulaire ordinaire, déclaré dans `views.list.filters` :

```ts
views: {
  list: {
    filters: {
      inputs: {
        title: { label: "Search a title" },
      },
    },
  },
}
```

Le filtre est écrit dans l'URL : un lien copié reproduit la même liste, et le bouton retour du navigateur fait ce qu'on attend de lui.

## 5. Un deuxième affichage

Les *layouts* décident de la manière de dessiner les mêmes lignes. Ajoutez des cartes à côté du tableau :

```ts
import { layout } from "react-resource-view"

views: {
  list: {
    layouts: [layout.table(), layout.cards({ columns: 3 })],
  },
}
```

Un sélecteur apparaît au-dessus de la liste. Changer d'affichage ne recharge rien et ne coûte pas une ligne de code de plus : le tableau, les cartes, mais aussi un board par colonnes, un calendrier ou une frise se déclarent de la même façon.

## Pour aller plus loin

En dix minutes, vous avez une application qui liste, filtre, crée, modifie et supprime, avec deux affichages. La suite se trouve dans la [documentation](/docs/resource-view/quickstart/) :

- les [backends et dialectes](/docs/resource-view/backends/) pour parler à Strapi, Supabase ou une API REST quelconque ;
- les permissions, pour dire qui peut faire quoi ;
- les layouts, pour choisir entre tableau, cartes, board, calendrier et les autres.

Le code est sur [GitHub](https://github.com/hermez-agency/react-resource-view), sous licence MIT.
