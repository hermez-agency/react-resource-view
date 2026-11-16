---
"react-resource-view": patch
---

Fixed: the sticky row-actions column of the table took the page's colour instead of the card's, drawing a darker band from the header down, ignoring hover and selection and overflowing the card's rounded corner; it now follows the card and the row, its shadow only shows while the table scrolls, and Delete is muted until hovered, with a gap between the buttons
