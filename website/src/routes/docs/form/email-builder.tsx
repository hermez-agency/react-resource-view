import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { A, C, H2, Li, P, Ul } from "@/components/prose"
import { BuilderStudio } from "@/demo/builder/BuilderStudio"
import { BUILDER_KITS } from "@/demo/builder/kits"

export const Route = createFileRoute("/docs/form/email-builder")({
  head: () => ({
    meta: [
      { title: "Email builder — react-data-form" },
      {
        name: "description",
        content:
          "The page builder's field with an email palette: an envelope beside the blocks, and a pure function that turns them into the table-based, inline-styled HTML Gmail, Outlook and Apple Mail agree on.",
      },
    ],
  }),
  component: EmailBuilder,
})

const EMAIL_KIT = BUILDER_KITS.find((kit) => kit.id === "email")!

const BLOCK = `import { addForm, SelectInputController, WysiwygInputController } from "react-data-form"

// Same shape as a page block: the identifying tag first, the palette's tag after.
addForm("email.text", {
  name: "Text",
  icon: AlignLeft,
  "@for": ["email.text", "email-block"],
  inputs: {
    title: { label: "Heading" },
    body: { label: "Body", controller: WysiwygInputController },
  },
})`

const FORM = `const emailForm = {
  label: { submit: "Save the newsletter" },
  inputs: {
    // The envelope: fields of the form itself, not blocks.
    subject: { label: "Subject", required: true },
    preheader: { label: "Preheader" },
    fromName: { label: "Sender name" },
    brandColor: { label: "Brand colour", controller: SelectButtonInputController,
                  valueOptions: BRAND_COLORS },
    // The message: the same array field as the page builder, another palette.
    blocks: createFormArrayInputController({ forms: ["email-block"], draggable: true }),
  },
}`

const RENDER = `import { renderEmail } from "./renderEmail"

const { html, text, size } = renderEmail(
  { envelope: { subject, preheader, fromName, brandColor }, blocks },
  // Where the PNGs of the library are served. "cid:" for inline attachments.
  { assetBaseUrl: "https://example.com/email/" }
)

size < 102 * 1024 // or Gmail shows "[Message clipped]"`

const OUTPUT = `<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr><td style="padding:16px 32px 24px;" align="center">
    <table role="presentation" align="center"><tr>
      <td bgcolor="#7c2d12" style="border-radius:6px;background:#7c2d12;">
        <!--[if mso]><v:roundrect href="https://…" fillcolor="#7c2d12" …>…</v:roundrect><![endif]-->
        <!--[if !mso]><!--><a href="https://…" style="display:inline-block;padding:14px 28px;color:#ffffff;…">Order Sunrise</a><!--<![endif]-->
      </td>
    </tr></table>
  </td></tr>
</table>`

const SEND = `# website/ — a developer's machine, never the deployed site
export SMTP_URL="smtp://login:smtp-key@smtp-relay.brevo.com:587"   # or BREVO_API_KEY=…
export MAIL_TEST_FROM="news@your-validated-domain.com"
export MAIL_TEST_TO="you@gmail.com"

node --experimental-strip-types scripts/send-test-email.ts              # the sample
node --experimental-strip-types scripts/send-test-email.ts export.html  # a "Download .html"
node --experimental-strip-types scripts/send-test-email.ts --dry-run    # build a .eml, send nothing`

function EmailBuilder() {
  return (
    <DocArticle
      toc={[
        { id: "same-field", title: "The same field, another palette" },
        { id: "envelope", title: "An envelope beside the blocks" },
        { id: "demo", title: "The builder, running" },
        { id: "render", title: "Rendering is a pure function" },
        { id: "why", title: "Why it looks like 2005" },
        { id: "testing", title: "Testing in a real mailbox" },
        { id: "gotchas", title: "Things worth knowing" },
      ]}
    >
      <P>
        An email builder is the example people ask for right after a{" "}
        <A href="/docs/form/asymmetric">page builder</A>, and the form half of it is
        the same: one array field, a palette of block types, a payload of typed
        objects. What changes is the other half. A page is drawn by components; an
        email is a string of HTML that leaves the application and is drawn by Gmail,
        Outlook or Apple Mail — each with its own, much smaller idea of CSS.
      </P>

      <H2 id="same-field">The same field, another palette</H2>

      <P>
        Eight block types — header, hero, text, button, image, two columns, divider
        and footer — each registered with <C>addForm</C> and tagged{" "}
        <C>email-block</C>. The field offers whatever carries that tag, exactly as{" "}
        <C>page-block</C> builds the landing page's palette.
      </P>

      <CodeBlock filename="emailBlocks.ts">{BLOCK}</CodeBlock>

      <H2 id="envelope">An envelope beside the blocks</H2>

      <P>
        An email has things that are not content: a subject, the grey preheader that
        follows it in the inbox, a sender name, a brand colour. They are not blocks —
        there is exactly one of each — so they are plain fields of the form, next to{" "}
        <C>blocks</C>. The payload becomes an object rather than a bare array, which
        is also the shape a newsletter is stored in.
      </P>

      <CodeBlock filename="emailForm.ts">{FORM}</CodeBlock>

      <H2 id="demo">The builder, running</H2>

      <P>
        The preview is not a set of React components that look like an email: it is
        the HTML <C>renderEmail</C> returns, in an <C>&lt;iframe srcdoc&gt;</C> that
        keeps the site's stylesheet out. What is on screen is what would be sent. The
        HTML and the plain-text part are one tab away, the weight is beside them, and
        Desktop / Mobile resize the frame to 600 and 375 pixels.
      </P>

      <Demo label="A newsletter — the envelope folds into Settings" wide>
        <BuilderStudio kit={EMAIL_KIT} />
      </Demo>

      <P>
        The <A href="/playground/builder?kit=email">playground</A> runs it at full size and
        saves into a Newsletters resource of its back office, edited there with the
        same builder.
      </P>

      <H2 id="render">Rendering is a pure function</H2>

      <P>
        <C>renderEmail</C> takes the envelope and the blocks and returns the HTML,
        the text part and the weight in bytes. It imports nothing — no React, no DOM,
        no Tailwind — so the browser preview, the export button, the test script and
        the unit tests all run the same code, and the file can be copied into another
        project as it stands.
      </P>

      <CodeBlock filename="usage.ts">{RENDER}</CodeBlock>

      <H2 id="why">Why it looks like 2005</H2>

      <P>
        The CSS every mail client agrees on is small, so the output is written in it
        and nothing else:
      </P>

      <Ul>
        <Li>
          <strong>Tables for layout.</strong> A 600px column in{" "}
          <C>&lt;table role="presentation"&gt;</C>, fluid below that. Outlook on
          Windows renders with Word, which knows neither flexbox nor grid; the two
          columns are inline blocks that wrap on a phone without a media query.
        </Li>
        <Li>
          <strong>Inline styles.</strong> On every element. The one{" "}
          <C>&lt;style&gt;</C> in the head adds the phone layout and a dark palette,
          and the message still reads correctly when a client drops it.
        </Li>
        <Li>
          <strong>Hosted images.</strong> Gmail blocks SVG and <C>data:</C> URIs, so
          the builder's SVG library is rasterised to PNG by a script and served by
          the site. Every <C>&lt;img&gt;</C> has an absolute URL, a width, a height
          and an alt text.
        </Li>
        <Li>
          <strong>A bulletproof button.</strong> A padded link inside a coloured
          cell, with a VML shape for Outlook on Windows, which ignores padding on
          links.
        </Li>
        <Li>
          <strong>Nothing typed becomes markup.</strong> Every field is escaped, and
          the rich text is reduced to <C>p</C>, <C>br</C>, <C>strong</C>, <C>em</C>,{" "}
          <C>a</C>, <C>ul</C>, <C>ol</C> and <C>li</C>, styled inline.
        </Li>
        <Li>
          <strong>Light and dark.</strong> <C>color-scheme</C> is declared, the
          palette avoids pure black and white, and a logo sits on a ground of its own
          so an inverted mailbox does not swallow it.
        </Li>
      </Ul>

      <CodeBlock filename="the button, rendered">{OUTPUT}</CodeBlock>

      <H2 id="testing">Testing in a real mailbox</H2>

      <P>
        A preview proves the HTML; only a mailbox proves the email. The site is
        static and public, so it sends nothing — a form that mailed what it was given
        would be a relay for spam. A script sends from a developer's machine instead,
        through Brevo or any SMTP server, reading its credentials from the
        environment and masking them in its output.
      </P>

      <CodeBlock lang="bash">{SEND}</CodeBlock>

      <P>
        Until the PNGs are deployed a mailbox cannot fetch them, so the script
        attaches them inline and points the images at <C>cid:</C> — the reason{" "}
        <C>assetBaseUrl</C> accepts that value. The full recipe — the files to copy,
        the checklist for Gmail, Outlook and mail-tester — is in the{" "}
        <A href="https://github.com/hermez-agency/react-resource-view/tree/main/website/src/demo/email">
          README next to the renderer
        </A>
        .
      </P>

      <Callout kind="warning" title="Not a sending service">
        <P>
          The builder makes the message, not the campaign: no list, no scheduling, no
          tracking, no bounce handling. Hand the HTML and the text part to whatever
          already sends your mail.
        </P>
      </Callout>

      <H2 id="gotchas">Things worth knowing</H2>

      <Ul>
        <Li>
          <strong>102 KB.</strong> Past that weight Gmail clips the message and hides
          the rest — the footer and its unsubscribe link first. The builder shows the
          weight against that limit as you type.
        </Li>
        <Li>
          <strong>Uploads cannot go in an email.</strong> A file read in the browser
          is a <C>data:</C> URI; the email palette only offers the hosted library,
          and the renderer drops anything else.
        </Li>
        <Li>
          <strong>The unsubscribe link is required.</strong> In law for a marketing
          email, and in practice for Gmail; the footer block will not validate
          without it, and the test script repeats it as a <C>List-Unsubscribe</C>{" "}
          header.
        </Li>
      </Ul>
    </DocArticle>
  )
}
