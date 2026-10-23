---
"react-resource-view": patch
---

fix(cli): un mot qui n'est pas une commande (`migrat`, `wombat`) sort avec le code 1 et propose la commande la plus proche (« Unknown command "migrat" — did you mean migrate? »), au lieu de créer `src/views/migratLayout.tsx` ; `help` affiche l'aide au lieu de créer `helpLayout.tsx`

`help [command]` et `--version` / `-v` fonctionnent, et l'aide range les options sous la commande qu'elles concernent. Le raccourci sans commande (`npx react-resource-view Heatmap`) reste possible, mais seulement pour un nom qui commence par une majuscule.
