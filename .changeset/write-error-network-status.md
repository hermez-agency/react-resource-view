---
"react-resource-view": patch
---

Changed: a write that fails without an answer says "The server could not be reached.", and one the API refuses without a detail (an HTML 500) shows its status, instead of a bare "An error occurred"

The toast of `useResourceMutation` and the one of the forms now follow the same rules as the load error: the API's detail when it gave one, else "<status> — The server answered with an error.", else, for a `fetch` that never got an answer, "The server could not be reached.".
