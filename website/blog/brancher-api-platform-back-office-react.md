---
title: "Brancher une API Platform à un back-office React : liste, formulaires et temps réel avec React Resource View"
description: "Un back-office React et TypeScript pour une API Platform (JSON-LD, Hydra) sans écrire les écrans CRUD : types générés depuis OpenAPI, ressource déclarée une fois, menu d'administration et rafraîchissement Mercure."
date: 2026-11-26
lang: fr
translation: api-platform-react-admin
tags:
  - Cas d'usage
  - API Platform
  - React
  - Back-office
  - TypeScript
---

Vous avez une API construite avec API Platform et il vous faut un back-office : lister les enregistrements, les filtrer, les créer, les modifier, les supprimer. Le réflexe est d'écrire un tableau, puis des formulaires, puis de câbler la pagination Hydra, les IRI et les messages de validation, ressource après ressource. Cet article montre le chemin le plus court avec React Resource View, qui parle JSON-LD et Hydra par défaut : de l'API à un back-office React en TypeScript, avec des types générés plutôt que recopiés.

L'exemple gère des `articles`, avec des données fictives. Il suppose une API qui tourne sur `https://api.example.com` et expose `/api/articles`.

## Ce que la bibliothèque comprend d'API Platform

Une collection API Platform répond en `application/ld+json` : les enregistrements sont dans `member`, leur nombre dans `totalItems`, chaque enregistrement porte un `@id` (son IRI, par exemple `/api/articles/7`), et une erreur de validation arrive sous forme de `violations`. Le dialecte JSON-LD de React Resource View lit tout cela : la pagination (`page` et `itemsPerPage`), les IRI, les violations affichées sur les champs concernés, et le canal Mercure pour le temps réel. Il n'y a rien à configurer pour qu'il soit actif, c'est le dialecte par défaut.

## 1. Installer et configurer l'accès à l'API

```bash
npm i react-resource-view react-data-form react-mini-i18n resource-registry
```

Puis, une seule fois, avant le premier rendu :

```ts
import { configureApi } from "react-resource-view"

configureApi({
  baseUrl: "https://api.example.com",
  getAuthToken: () => localStorage.getItem("token") ?? undefined,
})
```

Le jeton est ajouté à chaque requête, et transmis aussi à Mercure. Si votre application configure déjà `jsonld-api-client` avec `configureClient`, elle continue de fonctionner telle quelle : `configureApi` reprend ses réglages quand on ne lui en donne pas.

## 2. Des types qui viennent de l'API

Recopier à la main l'interface `Article` est la meilleure façon de la laisser dériver de l'API. API Platform publie son schéma OpenAPI ; l'outil [api-dumper](https://github.com/hermez-agency/api-dumper) en tire les types TypeScript :

```bash
pnpm add -D api-dumper typescript
```

```ts
// api-dumper.config.ts
import { defineConfig } from "api-dumper"

export default defineConfig({
  source: "https://api.example.com/api/docs.jsonopenapi",
  outDir: "src/api-schema",
  preset: "api-platform",
  strip: { contentTypes: ["text/csv"] },
})
```

`npx api-dumper` écrit les types dans `src/api-schema/` ; `npx api-dumper --check` échoue en CI quand ils ne correspondent plus à l'API. L'étape est facultative : sans elle, déclarez simplement une interface à la main.

## 3. Déclarer la ressource

Une déclaration dit où vit la ressource et quels champs elle porte. Ces champs sont à la fois les colonnes du tableau et les champs des formulaires de création et d'édition :

```ts
import { createViewResource, layout } from "react-resource-view"
import type { components } from "./api-schema/api-schema"

// L'élément est typé avec la forme que renvoie l'API : en JSON-LD, il porte "@id".
type Article = components["schemas"]["Article.jsonld"]

export const articles = createViewResource<Article>("articles", {
  name: "Articles",
  path: "/api/articles",
  realtime: true,
  form: {
    inputs: {
      title: { label: "Titre", required: true },
      author: { label: "Auteur" },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Chercher un titre" } } },
      layouts: [layout.table(), layout.cards({ columns: 3 })],
    },
  },
})
```

Les clés de `form.inputs` sont vérifiées contre le type `Article` : un champ qui n'existe pas dans le schéma devient une erreur TypeScript, pas une colonne vide découverte en recette. Le filtre « Chercher un titre » est envoyé à API Platform comme paramètre de requête (`title=…`), donc il suppose que le filtre correspondant est activé côté API, et il est écrit dans l'URL : un lien copié reproduit la même liste.

La liste s'affiche en tableau ou en cartes, au choix de l'utilisateur, sans recharger les données :

![La liste Articles dans le playground : sélecteur d'affichage, barre de filtres et tableau éditable, avec des données de démonstration](/blog/brancher-api-platform-react-back-office-playground.png "Le playground de React Resource View, avec des articles fictifs")

## 4. Un menu et une page d'administration

Les écrans d'une ressource vivent dans un *scope*, qui déclare ses ressources et habille leurs vues d'un menu latéral, d'un fil d'Ariane et, sur mobile, d'une barre du bas :

```ts
import { createAdminLayout, type ScopeInterface } from "react-resource-view"
import { articles } from "./articles"

export const adminScope: ScopeInterface = {
  name: "admin",
  label: "Back-office",
  decoratorComponent: createAdminLayout({}),
  resources: [articles],
  menu: "auto", // une entrée par ressource
}
```

Ajouter une deuxième ressource, c'est la déclarer et l'ajouter à `resources` : le menu, les routes et les liens suivent.

## 5. Les erreurs de validation au bon endroit

Quand API Platform refuse un enregistrement, il répond avec des `violations` : une liste de `propertyPath` et de messages. Le dialecte les rattache au champ du formulaire qui porte ce nom. Il n'y a pas de code à écrire pour qu'une contrainte `Assert\NotBlank` posée côté PHP s'affiche sous le champ « title ».

## 6. Le temps réel avec Mercure

Dans la déclaration plus haut, `realtime: true` suffit : la liste s'abonne au topic Mercure de la ressource et se relit quand l'API publie un changement. Deux précisions utiles :

- le topic n'est construit que pour un `path` sous `/api/`, le préfixe qui désigne une IRI ;
- si le hub répond par une erreur HTTP (un `401` après l'expiration du cookie, un `502` pendant un déploiement), la connexion est rouverte après 1 s, 2 s, 4 s… jusqu'à 30 s, et les vues se relisent dès que le hub revient.

Un hub privé sur un autre domaine demande les cookies : `realtime: { withCredentials: true }`.

## Ce que vous avez obtenu

Avec une configuration, une déclaration et un scope, le back-office liste, filtre, crée, modifie et supprime les articles de votre API Platform, avec des types qui suivent le schéma, deux affichages et un rafraîchissement en direct. Les permissions (`permissions: { delete: … }`), les autres affichages (board, calendrier, frise) et les actions personnalisées se déclarent au même endroit, quand vous en avez besoin.

Si votre API n'est pas API Platform, la déclaration ne change pas : on remplace le dialecte, par exemple `strapiDialect()`, `supabaseDialect()`, `springDialect()` ou `restDialect()`, dans `configureApi`.

## Pour aller plus loin

Installez la bibliothèque avec `npm i react-resource-view`, puis suivez le [démarrage rapide](/docs/resource-view/quickstart/). Les pages utiles pour ce cas :

- [les backends et dialectes](/docs/resource-view/backends/), pour les réglages de l'API ;
- [typer les ressources depuis OpenAPI](/docs/resource-view/openapi-types/), pour la recette complète d'api-dumper ;
- [la mise en page d'administration](/docs/resource-view/admin-layout/), pour le menu, les slots et le thème.

Le code est sur [GitHub](https://github.com/hermez-agency/react-resource-view), sous licence MIT.

*A Hermez product — [hermez.dev](https://hermez.dev).*
