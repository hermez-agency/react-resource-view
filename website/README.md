# react-resource-view — documentation site

The public documentation for
[`react-data-form`](https://github.com/hermez-agency/react-data-form) and
[`react-resource-view`](https://github.com/hermez-agency/react-resource-view),
built with [TanStack Start](https://tanstack.com/start).

The prose is rendered on the server; the examples are mounted in the browser and
are genuinely live — the forms submit, the lists filter, the records can be
created, edited and deleted.

## Why TanStack Start

`react-resource-view` keeps its whole view context in the URL and ships an
adapter for TanStack Router. Running the site on that router means the demos go
through the same navigation port the documentation recommends, instead of a
bespoke one written for the site — and the server rendering costs nothing extra.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck
pnpm build      # prerenders every route into dist/client, plus dist/server
pnpm start      # serves the build with a live server on $PORT (3000 by default)
```

This is a standalone project: it has its own `package.json` and lockfile, and it
consumes both libraries **from npm**, at the versions a reader would install.
It does not build against the working tree of the repository it lives in, so
the documented API is always the published one.

The price of that is a lag, and it is worth naming: a fix made to `src/` in this
repository does not reach the deployed site — the playground included — until it
is released and the version here is raised. A playground that still looks wrong
after a change to the package is usually this, not the change. Releasing means
merging the "chore: version packages" pull request changesets keeps open, then
raising `react-resource-view` in `package.json` and refreshing the lockfile.

`pnpm start` runs `server.mjs`, a small `node:http` bridge over the fetch
handler `vite build` emits. A host that takes a fetch handler directly can
import `dist/server/server.js` and ignore that file.

## Layout

```
src/
  routes/
    index.tsx              landing page
    playground.tsx         the shell the two playgrounds share
    playground/index.tsx   a complete back office, built from two scopes
    playground/builder.tsx a page builder, and the same field as a résumé and as an email
    docs.tsx               the docs shell: header + split sidebar
    docs/form/*            react-data-form           (14 pages)
    docs/resource-view/*   react-resource-view       (15 pages)
  components/              DocArticle, CodeBlock, Demo, FormDemo, ResourceDemo…
  demo/                    fixtures, the two demo resources, library setup
  demo/playground/         the playground's administration: scopes, shell, overview
  demo/playground/resources/  one file per resource — what the "Declaration" button shows
  demo/builder/            the block types, the three previews, the studio around them
  demo/email/              renderEmail — blocks to email HTML, pure, copyable (see its README)
  lib/navigation.ts        the sidebar model — the source of truth for pages
  styles/app.css           the theme, and the shadcn variables both libraries read
public/email/              the media library as PNG, for emails — generated, committed
scripts/
  generate-seo-files.ts    sitemap, robots.txt and llms.txt, after the build
  rasterize-email-media.ts the SVG library of the builder → public/email/*.png
  send-test-email.ts       sends the email builder's output to a real mailbox
  mail-sandbox.compose.yml Mailpit + SpamAssassin on localhost, to look at a send first
```

### The sidebar is split in two

`src/lib/navigation.ts` holds one section per package, each with its own colour,
npm name and repository link. Adding a page means adding a route file and an
entry there — `DocPage["href"]` is typed against the generated route tree, so an
entry pointing at a page that does not exist fails to compile.

### Adding a page

1. Create `src/routes/docs/<section>/<page>.tsx`, exporting a `Route` built with
   `createFileRoute` and rendering `<DocArticle toc={…}>`.
2. Add it to the matching group in `src/lib/navigation.ts`.

The title, summary, section badge and prev/next pager are all read from the
navigation model, so the page file only holds its own content.

## Sending a test email

The playground's email builder renders real email HTML (`src/demo/email/`), but
the site never sends anything: it is static and public, and a form that mailed
what it was given would be a relay for spam. A test goes out from a
developer's machine, with credentials read from the environment:

```bash
export SMTP_URL="smtp://login:key@smtp-relay.brevo.com:587"  # or BREVO_API_KEY=…
export MAIL_TEST_FROM="sender@a-validated-domain"
export MAIL_TEST_TO="you@example.com"
node --experimental-strip-types scripts/send-test-email.ts             # the sample
node --experimental-strip-types scripts/send-test-email.ts mail.html   # an export
node --experimental-strip-types scripts/send-test-email.ts --dry-run   # a .eml only
```

`docker compose -f scripts/mail-sandbox.compose.yml up -d` gives a local inbox
(Mailpit, http://localhost:8025) to send to first, with `SMTP_URL=smtp://localhost:1025`;
it receives but never delivers to a real mailbox.

Images go as inline `cid:` attachments until `public/email/` is deployed;
`--assets=production` points them at the deployed site instead. After changing
a drawing in `media.ts`, run `scripts/rasterize-email-media.ts` (it needs a
local Chrome) and commit the PNGs. The full procedure and the verification
checklist are in [`src/demo/email/README.md`](src/demo/email/README.md).

## Deploying

The build produces both halves, and the target decides which one is used.

### GitHub Pages — what this repository does

`.github/workflows/pages.yml` builds this project on every push to `main` and
publishes `website/dist/client`. Pages has no server to render on request, so
every route is prerendered to static HTML at build time: the reader still gets
server-rendered prose, produced earlier rather than per request. The demos are
unaffected — they were always mounted in the browser.

Pages serves a project site from `/<repository>/`, so the build takes the prefix
through `DOCS_BASE`:

```bash
DOCS_BASE=/react-resource-view/ pnpm build
```

That one variable reaches the Vite asset base, the router's basepath and the
links the view package builds. Building without it targets the domain root.

Two details Pages needs are handled in `public/`: `.nojekyll`, so paths are
served untouched, and the icons (`favicon.ico`, `rrv-symbol*.svg|png`) and the share image.

### A Node host

Build, then run `pnpm start` with `PORT` set — `server.mjs` bridges `node:http`
onto the fetch handler in `dist/server/server.js`, and pages are rendered per
request. A platform that takes a fetch handler directly can import that file and
ignore `server.mjs`; it can also serve `dist/client` from a CDN, since the
prerendered HTML is valid either way.

## Licence

MIT, like both packages.
