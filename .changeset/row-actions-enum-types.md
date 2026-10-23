---
"react-resource-view": patch
---

Fixed: `views.list.rowActions` rejects `ActionList.create` and `ActionList.list` at compile time, as it already rejected `"create"` and `"list"`, instead of accepting them. Only `read`, `update` and `delete` are accepted, written as strings or as the enum.
