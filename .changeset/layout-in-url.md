---
"react-resource-view": patch
---

Changer de layout écrit `variant=<id>` dans l'URL, comme le fait `filter`, au lieu de ne le garder qu'en mémoire : un rechargement ou un lien partagé retrouve le layout choisi. Une liste imbriquée dans un onglet ne touche pas à l'URL.
