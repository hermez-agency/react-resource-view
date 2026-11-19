---
"react-resource-view": patch
---

Changed: the built-in components no longer compile to selectors that make Chrome restyle the whole page when a window opens or closes, instead of `:has()` placed before the element it styles and `~` between any two slots

- Applications scanning `react-resource-view/dist` with `@source` no longer get `group-has-*`, `has-[…]:*:` or `has-[…]:[&>…]:` rules (field, checkbox, item, alert dialog, button group), nor `[data-slot] ~ [data-slot]` (button group). On a page of tens of thousands of nodes, each of them cost hundreds of milliseconds per opening or closing of a dialog.
- The same rules are written with a class as the subject, the `:has()` on the styled element itself, or `:nth-child(n + 2 of [data-slot])`: the components look the same, at the same specificity or higher.
- An application that worked around these classes with `@source not inline(…)` can drop that workaround.
