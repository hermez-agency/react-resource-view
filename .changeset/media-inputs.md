---
"react-resource-view": minor
---

feat(forms): deux contrôles média, `createMediaImageInput` (une image : aperçu, remplacer, recadrer, supprimer) et `createMediaFilesInput` (une liste de documents : nom, type, taille, aperçu ou icône, téléchargement, suppression), qui gardent le fichier en base64 dans l'enregistrement au lieu d'exiger une API d'upload

- Options : `accept` (types MIME, familles `image/*` ou extensions), `maxSize`, `maxFiles`, `dragAndDrop`, `crop: { aspect }` ; un fichier refusé est nommé sous le champ avec la raison, via `react-mini-i18n`.
- `store` change ce que devient un fichier : par défaut une data URL (`storeAsDataUrl`), ou l'URL renvoyée par une fonction qui l'envoie à l'API.
- `components: { dropzone, imagePreview, fileItem }` remplace une partie du rendu ; `mediaImageInputControllerFactory` et `mediaFilesInputControllerFactory` fixent ces options une fois pour toute l'application.
- Hors formulaire, `MediaValue` affiche une miniature pour une image et une icône avec le nom pour un document : sur une page de détail, dans une cellule de table (deux fichiers puis « +N ») et sur les cartes, au lieu du base64 brut.
