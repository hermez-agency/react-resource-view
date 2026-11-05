---
"react-resource-view": patch
---

Changed: `Button`, `Badge` and `TabsTrigger` transition only their colors, border, shadow and transform, instead of every property

- `transition-all` becomes `transition-[color,background-color,border-color,box-shadow,transform]`, as in the Brand Assets design system. Size and layout changes (a width set by the application, for instance) are no longer animated.
- The default theme sets `--heading-weight` to 600 and `--heading-tracking` to −0.02em, instead of 800 and −0.025em: headings are lighter.
