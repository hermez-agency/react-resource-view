---
"react-resource-view": patch
---

Fixed: the delete view shows the loading error with "Try again" when the record does not load, and "Continue" is disabled during the call, instead of leaving the dialog empty and sending two DELETE requests

A failing `getItem` (404, 403) left the body of the dialog empty, with no message and no way back. With `views.delete.optimistic: false`, a double click on "Continue" sent two DELETE requests: the button is now disabled during the deletion, in its destructive variant, and becomes active again if the API refuses.
