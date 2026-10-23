---
"react-resource-view": patch
---

fix(views): dans le calendrier et la timeline, une date sans heure (`2026-10-23`) tombe le bon jour dans tous les fuseaux et s'affiche sans heure, au lieu d'être lue en UTC (« 02:00 », ou la veille aux Amériques)
