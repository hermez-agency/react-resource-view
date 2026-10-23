---
"react-resource-view": minor
---

Added: `layout.board({ columns })` accepts a function `({ viewResourceContext, rows, defaults }) => columns`, read again at each render, and `hideEmpty` (on the board or on a column) hides the columns holding no card except while a card is dragged, instead of replacing the whole board list component to do either

- `defaults` are the options of the form's input the board groups by.
- "Move to…" still lists every column, hidden or not.
