# Changesets

Each `.md` file here becomes one entry of `CHANGELOG.md` at the next release —
the file published on npm, read by whoever upgrades the package, people and AIs
alike. `pnpm changeset` creates one; it is not committed for you
(`commit: false`), add it to your commit.

## Rules

- **English only**, like the rest of the published package.
- The first line starts with one of four headings, followed by a colon:
  - `Added:` — something new to use (an option, a component, a layout, an
    export);
  - `Changed:` — something that behaves differently and still works without
    touching the application;
  - `Fixed:` — a bug that no longer happens;
  - `Breaking:` — the application has to change (a removed or renamed export, an
    option that no longer means the same). Only with a `major` bump, and a
    `major` bump is always `Breaking:`.
- The rest of the first line says the effect, then what it replaces —
  "…, instead of …".
- More detail goes in the following paragraphs or in a list.

`src/changesets.test.ts` checks the heading, the bump and the language of every
file here, and of `CHANGELOG.md` from 1.2.0 on.

## Template

```md
---
"react-resource-view": patch
---

Fixed: changing a filter brings the list back to page 1, instead of keeping the current page and showing "No results yet" without pagination

- One line per detail worth knowing when upgrading.
```
