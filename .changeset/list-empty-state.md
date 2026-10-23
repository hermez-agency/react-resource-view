---
"react-resource-view": minor
---

Changed: an empty list tells "nothing yet" from "nothing matched", draws the resource's own icon and name, and offers to clear the filters when one is active, instead of always saying "Nothing matched your search"

- New `views.list.empty: { icon, title, body, filteredTitle }` declares them without a component; `icon` defaults to the resource's `icon`, `title` to "No <name> yet".
- The create button only shows where `permissions.create` allows it.
- `components.empty` still replaces the whole state.
