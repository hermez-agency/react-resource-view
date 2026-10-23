---
"react-resource-view": minor
---

Changed: the submit button of a form reads "Save" on an edit screen and "Create" on a creation one, instead of the name of the action ("update"), so `label.submit` is no longer needed to get those words

- A `label.submit` declared in the form still wins.
