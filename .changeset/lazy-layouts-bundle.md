---
"react-resource-view": patch
---

Changed: `createViewResource` alone weighs under 50 kB minified instead of 191 kB: the layouts, the views and the dialog/drawer frames are loaded the first time they are drawn, not bundled by every resource declaration.
