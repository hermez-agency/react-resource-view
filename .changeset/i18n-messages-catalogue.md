---
"react-resource-view": minor
---

Added: `react-resource-view/i18n` exports `messages`, the English reference of every message the library shows, and `missingKeys(dictionary)`, which lists the keys a dictionary leaves untranslated, instead of copying the keys by hand into each project

- `messages` is keyed on the English text: `messages["Saved"] === "Saved"`. A dictionary for another language has one entry per key.
- `missingKeys` returns the keys without an entry, and those with an empty one. Call it from a test to fail when a new version of the library adds a message your dictionary does not translate.
- The documentation has an "i18n" page that shows how to merge the catalogue with your own keys.
