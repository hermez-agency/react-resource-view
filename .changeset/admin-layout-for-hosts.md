---
"react-resource-view": minor
---

feat(admin): un hôte configure le layout d'admin par ses options, au lieu de le corriger de l'extérieur

- Le menu d'un scope garde les getters de ses entrées : un nom qui suit la langue, un lien qui suit le dernier choix du lecteur, sont relus à chaque dessin au lieu d'être figés au chargement du scope.
- `MenuItemInterface.badge` : un composant dessiné au bout de l'entrée (un compteur), sans remplacer l'entrée par un `component` qui refait son lien et son état actif. `useIsActiveMenuEntry` est exporté pour les entrées qui en ont quand même un.
- La barre du bas d'un téléphone porte `data-slot="admin-mobile-nav"` et `aria-current`, et ses entrées se partagent sa largeur au lieu de défiler de côté.
- `SidebarInset` est `min-w-0` : une vue `fullWidth` plus large que l'écran ne pousse plus la barre du haut hors de l'écran.
- Le fil d'Ariane se coupe à la place que lui laisse la barre, au lieu de passer sous son extrémité.
- L'icône d'une liste s'aligne sur son titre (`data-slot="list-header-title"`), et les cartes d'une colonne de board portent `data-slot="board-column-cards"`.
- Le bouton « créer » d'une liste prend le reste de sa ligne sur téléphone, à côté du sélecteur de layout, au lieu d'une ligne à lui.
- La barre de filtres n'élargit plus son contenu à `fit-content` : des filtres de l'application qui passent à la ligne y passent à la largeur de la liste.
- Une vue ouverte en dialog ne dépasse plus la hauteur de l'écran : le titre garde sa ligne, le contenu défile dans le reste.
