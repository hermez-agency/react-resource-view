---
"react-resource-view": patch
---

fix(views): l'export CSV préfixe d'une apostrophe les cellules qui commencent par `=`, `+`, `-`, `@`, une tabulation ou un retour chariot, au lieu de laisser Excel ou LibreOffice les exécuter comme des formules à l'ouverture (injection CSV, OWASP) ; l'export JSON reste inchangé
