# CLAUDE.md

## Ce que fait le projet

`react-resource-view` génère les vues CRUD (liste, détail, création, édition,
suppression) d'une ressource JSON-LD/Hydra à partir d'une seule déclaration,
bâti sur `react-data-form` pour les formulaires et `jsonld-repository` pour
l'accès aux données. Un système de dialectes permet aussi de parler à d'autres
API (Strapi, Supabase) sans changer la déclaration de la ressource.

## Stack

- React 19 + TypeScript, `strict` activé.
- Build avec **tsdown** (sortie ESM uniquement, bannière `"use client"` pour
  compatibilité RSC).
- Tests avec **vitest** (+ Testing Library, environnement `jsdom`).
- Lint avec **eslint** (config plate, `eslint-config-prettier` pour ne pas
  entrer en conflit avec Prettier).
- Formatage avec **Prettier** (`semi: false`, `printWidth: 85`).
- Gestionnaire de paquets **pnpm 10.33.2**, **Node 22** en CI.
- Versionning avec **Changesets** (`commit: false` : un changeset créé
  localement doit être commité à la main).
- Dépendances runtime clés : `jsonld-api-client`, `jsonld-item`,
  `jsonld-repository`, `coooking-pubsub`.
- Peer dependencies : `react`, `react-dom`, `react-data-form`,
  `resource-registry`, `react-mini-i18n` ; `tailwindcss` et
  `@tanstack/react-router` sont des peers optionnels.

## Commandes

```bash
pnpm install          # installation
pnpm run dev           # tsdown en mode watch
pnpm run build          # build de la librairie (dist/)
pnpm run test           # vitest run
pnpm run lint            # eslint .
pnpm run typecheck        # tsc --noEmit, puis les fixtures du codemod (cli/__fixtures__/playground)
pnpm run ci                # typecheck puis lint puis test puis build, dans cet ordre (ordre CI)
```

Documentation du dépôt (pages de référence, testées avec le reste du
paquet) :

```bash
pnpm run docs:dev     # site de doc en local (docs/vite.config.ts)
pnpm run docs:build    # build statique du site de doc
```

`cli/` et `website/` sont des projets à part (voir arborescence
ci-dessous) : ils ne se lancent pas avec les commandes ci-dessus.

## Arborescence utile

- `src/` — code de la librairie, organisé par domaine : `action/` (boutons
  d'action), `api/` (repository REST, dialectes), `components/`,
  `definition/` (fusion, résolution et validation en dev d'une déclaration),
  `hook/`, `internal/` (utilitaires non exportés), `layout/` (le namespace
  `layout.*` et `useLayout`), `menu/`, `provider/` (contextes React), `routes/`,
  `scope/`, `tanstack/` (adaptateur `@tanstack/react-router`, point d'entrée
  séparé), `ui/`, `utils/`, `views/` (une vue par action CRUD : `list`, `read`,
  `update`, `remove`). `ResourceDefinition.ts` = ce qu'on écrit,
  `ViewResource.ts` = ce que la lib construit.
- `cli/` — commande `react-resource-view` (Node ESM pur, pas de build, pas de
  types DOM navigateur) : `init`, `create-view-variant`, `migrate` (codemod
  0.x → 1.0, `cli/migrate.mjs`, fixtures dans `cli/__fixtures__/playground`).
- `migrations/1.0.json` — la liste des breaking changes 0.x → 1.0 en données ;
  lue par le codemod. `MIGRATION-1.0.md` en est la version rédigée,
  `docs/rfc/1.0-declaration.md` le raisonnement.
- `website/` — site public déployé (landing page + playground), projet
  autonome avec son propre `package.json` et son propre `pnpm-lock.yaml` ; il
  installe `react-resource-view` depuis npm, pas depuis ce dépôt —
  `RRV_SOURCE=src|dist` le fait tourner sur le working tree à la place
  (`website/resourceViewSource.ts`).
- `docs/` — pages de documentation de référence, importent la librairie
  directement depuis `src/` (pas depuis `dist/`) et sont testées par vitest
  avec le reste du paquet.
- `diagrams/` — source du diagramme d'architecture
  (`react-resource-view.architecture.json`) et images générées, publiées sur
  le site et dans le README.

## Syntaxe de déclaration (1.0) — la seule référence

```ts
import { createViewResource, layout } from "react-resource-view"

export const tasks = createViewResource<Task>("tasks", {
  name: "Tasks", // titres dérivés : "Tasks", "Edit — Tasks"…
  icon: ListTodo,
  path: "/api/tasks", // ou storage: "local", ou repository: { … }
  permissions: { delete: ({ item }) => item?.status !== "done" }, // tout est autorisé par défaut
  hooks: { beforeCreate: (data, { viewResourceContext }) => data },
  form: { inputs: TASK_FIELDS }, // commun à toutes les actions
  views: {
    list: {
      filters: {
        inputs: { title: { label: "Search" } },
        initial: { status: "todo" },
      },
      layouts: [
        layout.board({ groupBy: "status" }), // une colonne par option de `status`
        layout.table(),
      ],
      rowActions: ["read", "update", "delete"],
    },
    update: {
      open: "dialog",
      afterSave: "close",
      form: { inputs: { notes: false } },
    },
  },
})
```

- Racine = commun à toutes les actions (`form`, `fullWidth`, `titleField`,
  `components`, `description`) ; `views.<action>` = propre à une action ;
  fusion profonde racine → action → layout (`false` retire un input, `null`
  un composant).
- Le scope déclare ses ressources (`resources: [...]`, `menu: "auto"`) : une
  ressource ne déclare plus de `scope`.
- Plus de `view`, `behavior`, `canXxx`, `xxxViewOptionFactory`, `preXxx`,
  `limit`, `subViewResource` : voir `MIGRATION-1.0.md`. En dev,
  `createViewResource` lève une erreur avec la réécriture de toute clé 0.x.

## Conventions

- Alias d'import `@/*` → `src/*` (voir `tsconfig.json`, `vitest.config.ts`).
- Tests colocalisés à côté du code : `Truc.test.ts(x)`. Un test qui touche à
  la compatibilité d'un backend réel se nomme `*.integration.test.tsx`.
- `@typescript-eslint/no-explicit-any` est désactivé délibérément : les
  données de formulaire n'ont une forme connue qu'à l'exécution.
- Messages de commit au format `type(scope): description` (`feat`, `fix`,
  `docs`, `chore` ; scopes `views`, `api`, `cli`, `website`, `docs`…), la
  description décrivant l'effet plutôt que le changement technique — souvent
  sous la forme « fait X, pas Y » (voir l'historique Git pour des exemples).
- Changesets, `CHANGELOG.md` et JSDoc des API publiques (qui sortent dans
  `dist/*.d.ts`) en **anglais**, même quand le commit est en français : ils
  sont publiés sur npm. La première ligne d'un changeset commence par
  `Added:`, `Changed:`, `Fixed:` ou `Breaking:` (`Breaking:` si et seulement
  si le bump est `major`) ; modèle et règles dans `.changeset/README.md`,
  vérifiés par `src/changesets.test.ts`.
- `pnpm run format` / `format:check` appliquent Prettier ; ne pas ajouter de
  règle de style dans eslint qui le doublonnerait.

## Pièges connus

- **`tsdown.config.ts` a une liste `external` explicite** (`react`,
  `react-dom`, `react-mini-i18n`, `jsonld-item`, `resource-registry`,
  `react-data-form`, `@tanstack/react-router`…). Toute nouvelle dépendance
  destinée à rester une peer dependency doit y être ajoutée, sinon elle se
  retrouve embarquée dans `dist/` et peut dupliquer React chez le
  consommateur.
- Ne pas retirer la bannière `"use client"` de la sortie tsdown : elle est
  nécessaire pour que les composants restent utilisables dans un hôte RSC.
- `website/` a son propre lockfile et ses propres scripts (`typecheck`,
  `build`) ; il n'est ni lint-é ni testé par les commandes racine
  (`eslint.config.js` l'ignore explicitement, tout comme `docs/dist/**` et
  `.claude/**`). Une modification dans `src/` n'apparaît sur le site public
  qu'après publication npm — `docs/`, lui, importe directement depuis `src/`.
  En local, `RRV_SOURCE=src pnpm dev` dans `website/` monte le working tree
  dans le playground ; le job CI `website-against-worktree` fait le même build
  en `RRV_SOURCE=dist` pour qu'une régression de `src/` échoue sur la PR. Les
  tests du site, eux, restent sur la copie npm (raison dans
  `website/vitest.config.ts`).
- `.claude/` contient des skills d'agents restaurées via `skills-lock.json`
  (ex. `archify` pour le diagramme d'architecture) : ce sont des artefacts
  tiers, pas du code du paquet ; ils se restaurent avec `npx skills add`, pas
  à la main.
- `vitest.setup.ts` polyfille `window.matchMedia` et `EventSource`, absents
  de jsdom mais utilisés par les composants responsives au montage — les
  retirer fait échouer les tests silencieusement plutôt que clairement.
- `migrations/1.0.json`, `src/definition/legacyKeys.ts` (les clés 0.x que la
  validation en dev reconnaît) et `MIGRATION-1.0.md` disent la même chose ;
  des tests vérifient qu'ils restent alignés. Les fixtures `after/` du codemod
  se régénèrent avec `UPDATE_FIXTURES=1 pnpm vitest run cli/migrate.test.ts`.
- `website/` est écrit en 1.0 et installe la 1.0 depuis npm (`^1.0.0`,
  remonté par `release.yml` à chaque publication).
- Un changeset créé avec `pnpm changeset` n'est pas commité automatiquement
  (`commit: false` dans `.changeset/config.json`) : il faut l'ajouter au
  commit soi-même. Le bump de version et la publication npm sont ensuite
  gérés par la CI (`release.yml`) via une pull request « Version Packages »,
  pas manuellement.
