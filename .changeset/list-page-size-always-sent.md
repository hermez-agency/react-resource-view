---
"react-resource-view": patch
---

fix(api): la liste envoie toujours sa taille de page (30 sans `views.list.pageSize`), au lieu de laisser Spring répondre 20 lignes et Strapi 25 pendant que la pagination en compte 30
