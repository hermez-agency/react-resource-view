---
"react-resource-view": patch
---

Les clés de `form.inputs` sont vérifiées contre l'item : `inputs: { titel }` est une erreur TypeScript, au lieu de compiler sans rien dire. Un champ qui n'existe pas sur l'item (confirmation de mot de passe…) se déclare dans le second générique, `createViewResource<User, User & { confirm: string }>` ; `filters.inputs` reste libre, et le README le dit.
