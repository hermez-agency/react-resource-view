# Email rendering — a recipe to reuse

Blocks in, email out: `renderEmail` turns the envelope and the blocks of an
email builder into the HTML a mailbox receives, its plain-text part and its
weight. It is written to be copied into another project (Opoil, Animalink…)
without bringing this site along.

## The files

| File | Copy it? | What it is |
| --- | --- | --- |
| `renderEmail.ts` | **yes, as is** | The renderer. Imports nothing: no React, no DOM, no Tailwind. |
| `renderEmail.test.ts` | yes, adapt the import of the sample | The constraints below, as vitest tests. |
| `sample.ts` | as a model | A sample newsletter, plain data, readable from Node. |
| `emailDocument.ts` | no — site glue | Where this site serves its PNGs, form fields → envelope, download. |
| `../builder/emailBlocks.ts` | as a model | The eight `addForm` blocks of the palette (`email-block`). |
| `../builder/EmailPreview.tsx` | as a model | The mailbox frame + `<iframe srcdoc>` preview. |
| `../../../scripts/rasterize-email-media.ts` | if your images are SVG | SVG → PNG with headless Chrome. |
| `../../../scripts/send-test-email.ts` | **yes** | Sends a test through Brevo or SMTP (needs `nodemailer`). |

## The API

```ts
import { renderEmail, GMAIL_CLIP_LIMIT } from "./renderEmail"

const { html, text, size } = renderEmail(
  {
    envelope: { subject, preheader, fromName, brandColor: "#7c2d12" },
    blocks, // [{ type: "email.hero", image: "sunrise", title: "…" }, …]
  },
  { assetBaseUrl: "https://example.com/email/" } // or "cid:"
)
```

- `envelope` — `subject` (the `<title>`), `preheader` (hidden at the top of the
  body), `fromName` (for the sender, not drawn), `brandColor` (`#rgb` /
  `#rrggbb`, anything else falls back to `#7c2d12`).
- `blocks` — sorted on `order` when present. Types, and the fields each reads:

  | `type` | Fields |
  | --- | --- |
  | `email.header` | `brand`, `logo` (image id), `color` (overrides the brand colour) |
  | `email.hero` | `image`, `title`, `subtitle` |
  | `email.text` | `title`, `body` (WYSIWYG HTML, sanitised) |
  | `email.button` | `label`, `url`, `align` (`left` / `center`) |
  | `email.image` | `image`, `caption` (also the alt), `url` |
  | `email.columns` | `leftImage`, `leftTitle`, `leftText`, `leftUrl`, the same with `right`, `action` (link label) |
  | `email.separator` | `kind` (`line` / `space`), `size` (`small` / `medium` / `large`) |
  | `email.footer` | `address`, `reason`, `unsubscribeUrl`, `unsubscribeLabel` |

  An unknown type is skipped.
- `assetBaseUrl` — an image stored as an id (`sunrise`) becomes
  `${assetBaseUrl}sunrise.png`. An absolute `https` URL is kept (unless it is an
  SVG). A `data:` URI, a relative path or an SVG is dropped. A relative
  `assetBaseUrl` throws: a mailbox has nothing to resolve it against.
- Returns `html`, `text` (the `text/plain` part) and `size` (bytes of UTF-8).
  Compare `size` with `GMAIL_CLIP_LIMIT` (102 KB).

Also exported: `escapeHtml`, `safeUrl` (http(s) and mailto only, bare domains
upgraded to https), `sanitizeRichText`, `imageUrl`, `brandColor`, `formatSize`.

## The constraints it enforces

Gmail (web and app), Apple Mail and Outlook (web at least) must all render it.

- **Tables**: `<table role="presentation">`, a 600px column, fluid below. No
  flex, no grid. Outlook desktop gets ghost tables in `<!--[if mso]>`.
- **Inline styles** on every element. One `<style>` in the head for the phone
  layout and the dark palette; the mail stays correct when it is stripped.
- **Images**: PNG/JPEG at an absolute URL, `width`, `height` and `alt` on every
  `<img>`. Never SVG, never `data:` (Gmail blocks both).
- **Links**: absolute. The button is a padded link in a coloured cell, plus a
  VML `v:roundrect` for Outlook desktop.
- **Preheader** hidden at the top of the body, padded with invisible
  characters so the inbox line does not fill up with the first words.
- **Text part** generated alongside the HTML.
- **Weight** under 102 KB, or Gmail shows "[Message clipped]" and hides the
  footer — the unsubscribe link first. The sample weighs about 11 KB.
- **Rich text** reduced to `p br strong em a ul ol li`, styled inline.
  Headings and quotes become paragraphs, other tags are unwrapped (text kept,
  escaped), `script`/`style`/`iframe`/… are dropped with their content,
  attributes are never copied. Every plain field, the subject included, is
  escaped.
- **Dark mode**: `color-scheme` and `supported-color-schemes` declared (meta
  and `:root`), a `prefers-color-scheme: dark` palette (Apple Mail, Outlook
  apps), `[data-ogsc]`/`[data-ogsb]` overrides (Outlook.com), no pure
  black/white so clients that invert (Gmail apps) stay legible, and logos drawn
  on their own ground.

## Testing in a real mailbox

The site is static: it never sends. A test is sent from a developer's machine.

### Variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `BREVO_API_KEY` | one of the two | Brevo transactional API key. Images must then be online (`--assets=production`): the API has no inline attachments. |
| `SMTP_URL` | one of the two | `smtp://user:pass@host:587` (STARTTLS) or `smtps://…:465`. Brevo's relay works: `smtp://<login>:<smtp key>@smtp-relay.brevo.com:587`. So does a Gmail account, with an app password (Google account › Security › App passwords, 2-step verification on): `smtps://you%40gmail.com:<app password>@smtp.gmail.com:465`, with `MAIL_TEST_FROM` set to that same address. |
| `MAIL_TEST_FROM` | yes | A sender validated with the provider (domain with SPF/DKIM, ideally DMARC). |
| `MAIL_TEST_TO` | yes | Recipient(s), comma-separated. |
| `MAIL_TEST_FROM_NAME` | no | Display name; default the envelope's `fromName`. |
| `EMAIL_ASSET_BASE` | no | Where the PNGs are served; default `https://hermez.dev/react-resource-view/email/`. |

Never commit them; export them in the shell, or keep them in a file outside the
repository. The script masks keys and SMTP passwords in what it prints.

### Commands (from `website/`)

```bash
node --experimental-strip-types scripts/send-test-email.ts                 # the sample
node --experimental-strip-types scripts/send-test-email.ts newsletter.html # a "Download .html"
node --experimental-strip-types scripts/send-test-email.ts --assets=production
node --experimental-strip-types scripts/send-test-email.ts --dry-run       # writes a .eml, sends nothing
```

An exported file has its images on whatever host served the builder
(`localhost` in development); the script points them again, at `cid:`
attachments or at `EMAIL_ASSET_BASE`. In production mode it checks every image
URL answers before sending.

Two passes: first `cid:` (images inside the message, works before deployment),
then, once the site is deployed, `--assets=production` (the real setting).

### A local sandbox first

Before a real mailbox, a local one: `scripts/mail-sandbox.compose.yml` starts
Mailpit (SMTP on `:1025`, inbox on http://localhost:8025) with SpamAssassin.

```bash
docker compose -f scripts/mail-sandbox.compose.yml up -d
SMTP_URL=smtp://localhost:1025 MAIL_TEST_FROM="Test <test@example.test>" \
  node --experimental-strip-types scripts/send-test-email.ts
```

Mailpit shows the message as a client would (desktop, tablet, phone widths),
its source, its text part and headers, and three checks: **HTML Check**
(support of each HTML/CSS feature across clients, from caniemail), **Link
Check** (every link answers, without redirect) and **Spam Analysis**
(SpamAssassin on the content). The sample scores 90 % / all links 200 / -0.3.

It catches, it does not deliver. Pointing a local SMTP server at Gmail's MX
from a home connection fails: the ISP blocks port 25 over IPv4, and over IPv6
Gmail answers `550 5.7.1 … does not meet IPv6 sending guidelines regarding PTR
records and authentication`. A real inbox needs a relay that authenticates the
sender (Brevo, or a Gmail app password).

### Checklist, per send

Gmail web (the account that receives):

- [ ] received in the inbox, not in spam or Promotions-only-by-mistake
- [ ] subject and preheader read correctly in the list
- [ ] images displayed (or shown after "Display images" for a new sender)
- [ ] button and links clickable, hovering shows the expected URLs
- [ ] content 600px wide, centred; nothing overflows
- [ ] no "[Message clipped]" at the bottom
- [ ] narrow window (~390px): columns stacked, text readable, no horizontal scroll
- [ ] Gmail's dark theme: text readable, logo visible, button readable
- [ ] "Show original": SPF, DKIM and DMARC `PASS`

Outlook.com (if an account is available): same list, plus the button shape and
dark mode.

mail-tester.com: send to the address it gives, aim for ≥ 9/10, and write down
every point lost — usually authentication (SPF/DKIM/DMARC of the sender
domain), a missing `List-Unsubscribe`, or a too-high image/text ratio.

### What has been verified so far

Verified: the vitest constraints, the preview in the playground (headless
Chrome, desktop and 375px, light and dark site themes), and a send through the
Mailpit + SpamAssassin sandbox (HTML Check 90 %, Link Check all 200,
SpamAssassin -0.3, rendering at desktop width and 390px).

Not verified yet: delivery to a real inbox. No Gmail, Outlook.com or
mail-tester.com check has been run, because no authenticated relay was
available when this was built. Treat the checklist above as still to do on the
first project that has `SMTP_URL` or `BREVO_API_KEY`.

## Pitfalls met while building this

- **Grain makes PNGs huge.** The SVG library has a noise filter; rasterised
  with it, one 1280×800 picture weighed 1.2 MB. Without it, 30–70 KB. The
  rasteriser removes the grain.
- **Screenshots are opaque by default.** A rounded logo got white corners on a
  coloured header; Chrome needs `--default-background-color=00000000`.
- **Brevo's API cannot do `cid:`.** Its `attachment` field has no Content-ID.
  Use its SMTP relay for inline images, or deploy the images first.
- **Brand-coloured links vanish in dark mode.** `#7c2d12` on a dark canvas is
  unreadable: links carry `em-link`, recoloured in the dark palette.
- **A preview iframe can oscillate.** When it is resized, a scrollbar appears,
  narrows the message, which grows, which keeps the scrollbar. The preview
  hides overflow on the live document (not in the HTML) and watches the body
  with a `ResizeObserver`.
- **The iframe inherits the page's colour scheme.** On a dark site the
  message's own dark palette applies — useful, as long as one knows the light
  rendering is one theme switch away.
- **A redirect behind every link.** `…/playground` answered 301 towards
  `…/playground/`; Mailpit's Link Check showed it. Links point at the final
  URL, trailing slash included.
- **`MAIL_TEST_FROM="Name <address>"`** used to be wrapped once more by the
  script (`Name <Name <address>>`); the script now accepts both forms.
- **A local SMTP server cannot reach Gmail** (see "A local sandbox first").
- **Lines over 998 characters** break SMTP. The renderer emits long lines; the
  script relies on nodemailer's quoted-printable encoding to fold them.
