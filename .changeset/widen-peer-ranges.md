---
"react-resource-view": patch
---

fix: the `react-data-form` and `react-mini-i18n` peers accept their current releases (`^0.3.0`, `^0.1.0 || ^0.2.0`), so `pnpm add react-resource-view react-data-form react-mini-i18n resource-registry` installs them instead of react-data-form 0.1.0

- In 0.x a caret pins the minor: `^0.1.0` ruled out react-data-form 0.2 and 0.3 and react-mini-i18n 0.2, which only add features. `init` writes the same ranges into a new starter.
- `react-mini-i18n` keeps `^0.1.0` alongside `^0.2.0`: react-data-form 0.3.0 still asks for `^0.1.0`, and npm would otherwise refuse the install with `ERESOLVE`.
