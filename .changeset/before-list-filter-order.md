---
"react-resource-view": patch
---

fix(views): `hooks.beforeList` reçoit le filtre de la vue déjà fusionné et a le dernier mot, au lieu de voir le filtre ajouté après son retour (un `search` renommé en `q` partait avec les deux clés, une clé retirée revenait)
