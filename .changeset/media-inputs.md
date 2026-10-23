---
"react-resource-view": minor
---

Added: two media controls, `createMediaImageInput` (one image: preview, replace, crop, remove) and `createMediaFilesInput` (a list of documents: name, type, size, preview or icon, download, removal), which keep the file as base64 in the record instead of requiring an upload API

- Options: `accept` (MIME types, `image/*` families or extensions), `maxSize`, `maxFiles`, `dragAndDrop`, `crop: { aspect }`; a refused file is named under the field with the reason, through `react-mini-i18n`.
- `store` changes what becomes of a file: a data URL by default (`storeAsDataUrl`), or the URL returned by a function that sends it to the API.
- `components: { dropzone, imagePreview, fileItem }` replaces part of the rendering; `mediaImageInputControllerFactory` and `mediaFilesInputControllerFactory` set these options once for the whole application.
- Outside a form, `MediaValue` shows a thumbnail for an image and an icon with the name for a document: on a detail page, in a table cell (two files then "+N") and on the cards, instead of the raw base64.
