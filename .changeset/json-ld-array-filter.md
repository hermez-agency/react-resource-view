---
"react-resource-view": patch
---

fix(api): sur le backend JSON-LD par défaut, un filtre tableau part en `status[]=a&status[]=b`, au lieu de `status=a&status=b` dont API Platform ne gardait que la dernière valeur
