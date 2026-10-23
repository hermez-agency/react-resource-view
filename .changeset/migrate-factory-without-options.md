---
"react-resource-view": patch
---

fix(cli): le codemod `migrate` réécrit `tableViewOptionFactory()` sans argument en `layout.table()`, et une factory appelée avec une variable en `layout.cards(opts)` signalée à reprendre à la main, au lieu de planter sur une TypeError qui ne nomme pas le fichier

Un fichier que la migration ne sait pas lire ou réécrire est maintenant nommé avec son erreur et laissé tel quel ; les autres fichiers sont traités quand même, et la commande se termine avec le code 1 — le projet n'est plus laissé à moitié migré sans savoir où.
