---
"react-resource-view": patch
---

fix(cli): le codemod `migrate` sort avec le code 1 sur un chemin qui n'existe pas et traite les fichiers `.mts`, `.cts` et `.cjs`, au lieu d'annoncer « 0 files rewritten. » et de laisser passer `--check` en CI

Les erreurs (option inconnue, chemin absent, fichier impossible à migrer) sont écrites sur stderr, et non plus sur stdout.
