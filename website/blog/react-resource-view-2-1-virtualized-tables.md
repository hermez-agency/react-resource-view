---
title: "React Resource View 2.1: virtualized tables and dialogs that open without freezing the page"
description: "React Resource View 2.1 (with react-data-form 0.5.0) only mounts the visible rows of a table past 200 rows, and drops the CSS selectors that made the browser restyle the whole page every time a dialog opened. Measured numbers and how to use it."
date: 2026-11-19
lang: en
translation: rrv-2-1-virtualized-tables
tags:
  - What's new
  - React
  - Performance
  - TypeScript
---

React Resource View 2.1.0 is out on npm. It changes nothing about how you declare a resource: it speeds up two things you notice as soon as your data grows, a table with several thousand rows and opening a dialog on a large page. No migration is needed.

## A table that only renders what is on screen

Until now, `layout.table()` mounted one DOM row per record on the page. With a few hundred rows you couldn't tell; with a few thousand, opening the list, scrolling and every state change paid the price.

In 2.1, past 200 rows, the table only renders the visible rows, plus a few on either side of the viewport. The rest is replaced by two spacer rows sized to the measured height of the missing rows, so the scrollbar keeps its size and position.

Measured on a page of 2,000 rows, in jsdom (the browser simulator used by the tests, not a real browser):

| | Before | After |
| --- | --- | --- |
| Mounted DOM nodes | 64,044 | 782 |
| Mount time | about 14.7 s | about 0.2 to 0.35 s |

These numbers come from a test, not from a browser profile: they tell you how much work goes away, not exactly how much time you will save on your machine.

### What stays the same

The table is still a real `<table>`: the header and pinned cells stay put, and column widths are kept while scrolling. Groups (collapsed or not) and views expanded under a row are virtualized as a single flat list.

Anything that touches data doesn't depend on what is rendered: "Select all" and bulk actions apply to every record on the page, visible or not. On the keyboard, `↑` / `↓` and `Ctrl+Home` / `Ctrl+End` move between rows and scroll to them. The table carries `aria-rowcount` and each row `aria-rowindex`, so screen readers announce the right position in the full list.

## How to turn it on

There is nothing to do: virtualization is on by default past 200 rows. To tune it:

```ts
layout.table({ virtualize: false }) // all rows, always
layout.table({ virtualize: true }) // only the ones on screen, always
layout.table({ virtualize: { threshold: 500, overscan: 4 } })
```

`threshold` is the number of rows from which virtualization kicks in, and `overscan` the number of rows rendered beyond each edge of the viewport (8 by default). The update adds one dependency, `@tanstack/react-virtual`, installed with the package.

## Dialogs that no longer make the browser restyle everything

The second change is a performance fix. Some components (field, checkbox, list item, confirmation dialog, button group) produced CSS selectors with a `:has()` placed before the styled element, or a `~` between two arbitrary elements. On a page with tens of thousands of nodes, Chrome then had to recalculate styles for the whole page: hundreds of milliseconds every time a dialog opened or closed.

These rules are now written differently: a class as the subject, the `:has()` on the styled element itself, or `:nth-child(n + 2 of [data-slot])`. The components look the same, with the same specificity or higher. A test builds the stylesheet with Tailwind's scanner and fails if any of these patterns comes back.

If your app scans `react-resource-view/dist` with `@source` and worked around the problem with `@source not inline(…)`, you can remove that workaround.

## On the react-data-form 0.5.0 side

React Resource View's forms come from `react-data-form`, which ships its 0.5.0 release the same day. It applies the same performance fix to its own components (`Checkbox`, `Field`, `FieldDescription`, `ItemMedia`): no more `:has()` placed before the styled element, so form dialogs open faster on large pages, with unchanged rendering.

It also brings:

- a stylesheet aligned with the Brand Assets design system: `--heading-weight` goes to 600, `--heading-tracking` to `-0.02em`, the `--shadow-glow` token is removed, and fields use named transitions instead of `transition-all`. If your theme relied on `--shadow-glow`, replace it;
- a fix to `FormArrayInputController`: editing a block now only edits that block, instead of overwriting another one when the stored order differs from the array order.

## Upgrading

```bash
npm i react-resource-view@latest react-data-form@latest
```

The full list is in the [changelog](https://github.com/hermez-agency/react-resource-view/blob/main/CHANGELOG.md). The `virtualize` option is covered in the [layouts documentation](/docs/resource-view/layouts/), and the code is on [GitHub](https://github.com/hermez-agency/react-resource-view), under the MIT license.

*A Hermez product*
