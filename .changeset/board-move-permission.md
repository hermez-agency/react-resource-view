---
"react-resource-view": patch
---

fix(views): une ressource peut laisser déplacer les cartes d'un board sans offrir le formulaire d'édition (`permissions: { update: false, move: true }`), au lieu de bloquer les cartes dès que `update` est refusé

La nouvelle permission `move` répond comme `update` tant qu'elle n'est pas déclarée : rien ne change pour une ressource qui ne la mentionne pas. Le codemod `migrate` pose un `TODO(RV1-PERM-008)` sur `update` quand `canUpdate` est refusé sur une déclaration qui dessine un board — en 0.x, ses cartes bougeaient quand même. Documenté dans `MIGRATION-1.0.md` et `migrations/1.0.json`.
