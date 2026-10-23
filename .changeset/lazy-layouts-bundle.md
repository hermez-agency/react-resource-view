---
"react-resource-view": patch
---

perf(bundle): `createViewResource` seul pèse 37 ko minifiés au lieu de 191 ko — les layouts, les vues et les cadres dialog/drawer se chargent à la première utilisation, au lieu d'être embarqués par toute déclaration de ressource
