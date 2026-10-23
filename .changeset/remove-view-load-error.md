---
"react-resource-view": patch
---

fix(views): la suppression affiche l'erreur de chargement avec « Try again » quand l'enregistrement ne se charge pas, et « Continue » se désactive pendant l'appel, au lieu de laisser la dialog vide et d'envoyer deux DELETE

Un `getItem` qui échoue (404, 403) laissait le corps de la dialog vide, sans message ni moyen de revenir. Avec `views.delete.optimistic: false`, un double clic sur « Continue » envoyait deux requêtes DELETE : le bouton est maintenant désactivé pendant la suppression, en variante destructive, et redevient actif si l'API refuse.
