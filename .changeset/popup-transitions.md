---
"react-resource-view": patch
---

fix(ui): les dialogs, drawers, popovers et selects s'ouvrent et se ferment en fondu, au lieu d'apparaître et disparaître d'un coup

- `dialog`, `alert-dialog`, `popover` et `select` s'animaient avec `animate-in`, `fade-in-0`, `zoom-in-95` et `slide-in-from-*`. Ces classes ne viennent pas de Tailwind : elles appartiennent à `tailwindcss-animate` / `tw-animate-css`, qui n'est ni installé ni importé — elles ne généraient donc aucun CSS. Elles sont remplacées par des transitions sur `opacity` et `scale`, pilotées par les attributs `data-starting-style` / `data-ending-style` de Base UI, comme le fait déjà `drawer`. Rien à installer côté application : ce sont des utilitaires Tailwind de base.
- Une vue ouverte en dialog ou en drawer n'animait ni son entrée ni sa sortie, quel que soit le CSS : le cadre était monté déjà ouvert, et la fermeture changeait l'URL, donc le démontait, avant que la transition ait pu démarrer. Il s'ouvre maintenant juste avant que la page soit peinte sans lui, et l'URL ne change qu'une fois la transition de sortie terminée.
- Le popup d'un `select` aligné sur son déclencheur (`alignItemWithTrigger`, la valeur par défaut) reste sans animation : l'élément sélectionné y est posé sur le bouton, et le faire grandir l'en ferait glisser.
