---
"react-resource-view": minor
---

Added: `layout.gallery({ imageField })` draws a grid of cards headed by a picture, for products, articles or profiles

- `imageField` is typed on the item and accepts an URL, a data URL, a media object (`{ url, name }`) or a list of them; a record without an image gets a placeholder, and the pictures load lazily.
- `aspect` (`"4/3"`, `"1/1"`, `"16/9"`), `fit` (`"cover"`, `"contain"`), `titleField`, `columns` and `fields` shape the cards.
