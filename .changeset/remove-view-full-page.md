---
"react-resource-view": patch
---

Fixed: the delete view is shown on a full page (direct route `…/delete/1`, `views.delete.open: "page"`) instead of throwing `DialogRootContext is missing`, and "Cancel" goes back to the list there.
