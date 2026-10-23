---
"react-resource-view": patch
---

fix(provider): une ressource inconnue lève `Resource "x" is not registered. Registered: …` et une action sans vue `Resource "x" has no "update" view. Available: …`, au lieu de « View not found » dans les deux cas
