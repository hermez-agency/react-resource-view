---
"react-resource-view": minor
---

Changed: `layout.cards({ frame: false })` draws `components.row` on its own, without border, padding or actions footer, and `actions: false` removes the actions footer of a framed card, instead of always wrapping the row in a card of its own

- A row component that already draws its own card no longer gets a double frame; selection and opening keep working.
- The codemod writes `frame: false` on cards whose `cardViewOptionFactory` had a `rowComponent`.
