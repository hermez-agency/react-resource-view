import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import nodemailer from "nodemailer"
import {
  GMAIL_CLIP_LIMIT,
  formatSize,
  renderEmail,
} from "../src/demo/email/renderEmail.ts"
import { SAMPLE_BLOCKS, SAMPLE_ENVELOPE } from "../src/demo/email/sample.ts"

/**
 * Sends one test email to a real mailbox — from a developer's machine, never
 * from the site, which is static and must not become a relay for spam.
 *
 *   node --experimental-strip-types scripts/send-test-email.ts [file.html] [options]
 *
 * Without a file it renders the sample newsletter (`src/demo/email/sample.ts`);
 * with one, it sends that file — an HTML exported from the playground's
 * "Download .html".
 *
 * Options:
 *   --assets=cid         images as inline attachments (default over SMTP)
 *   --assets=production  images from the deployed site (default over Brevo)
 *   --dry-run            build the message, send nothing, write it to a .eml
 *
 * Environment — nothing is ever read from a file of the repository:
 *   BREVO_API_KEY     sends through Brevo's transactional API, or
 *   SMTP_URL          smtp(s)://user:password@host:port, used when no Brevo key
 *                     (smtp://localhost:1025: the Mailpit of mail-sandbox.compose.yml)
 *   MAIL_TEST_FROM    the sender, an address validated with the provider
 *   MAIL_TEST_TO      the recipient(s), comma-separated
 *   EMAIL_ASSET_BASE  where the PNGs are served; default the GitHub Pages site
 *
 * Images. A mailbox cannot reach `localhost`, so until `public/email/` is
 * deployed the images travel inside the message, as `cid:` attachments. Brevo's
 * API has no inline attachments, so over Brevo the images must be online —
 * or send through Brevo's SMTP relay (smtp-relay.brevo.com:587) instead.
 */

const PRODUCTION_ASSETS = "https://hermez.dev/react-resource-view/email/"
const ASSET_DIR = join(import.meta.dirname, "..", "public", "email")

const args = process.argv.slice(2)
const flag = (name: string) => args.find((arg) => arg.startsWith(`--${name}`))
const file = args.find((arg) => !arg.startsWith("--"))
const dryRun = Boolean(flag("dry-run"))

const env = {
  brevoKey: process.env.BREVO_API_KEY?.trim(),
  smtpUrl: process.env.SMTP_URL?.trim(),
  // "Name <address>" is accepted too: the name then wins over the envelope's.
  from:
    /<([^>]+)>/.exec(process.env.MAIL_TEST_FROM ?? "")?.[1]?.trim() ??
    process.env.MAIL_TEST_FROM?.trim(),
  fromName:
    /^\s*"?([^"<]*?)"?\s*</.exec(process.env.MAIL_TEST_FROM ?? "")?.[1] || undefined,
  to: (process.env.MAIL_TEST_TO ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean),
  assetBase: process.env.EMAIL_ASSET_BASE?.trim() || PRODUCTION_ASSETS,
}

/* -------------------------------------------------------------------------- */
/* Logging, with every secret masked                                          */
/* -------------------------------------------------------------------------- */

function maskKey(key: string): string {
  return `${key.slice(0, 4)}…(${key.length} chars, masked)`
}

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = "***"
    return parsed.href
  } catch {
    return "(unparseable SMTP_URL, masked)"
  }
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/* -------------------------------------------------------------------------- */
/* The message                                                                */
/* -------------------------------------------------------------------------- */

const transport = env.brevoKey ? "brevo" : env.smtpUrl ? "smtp" : undefined

if (!transport && !dryRun) {
  fail(`Nothing to send with. Set one of:
  BREVO_API_KEY   a Brevo API key (Brevo › SMTP & API › API keys), or
  SMTP_URL        smtp://user:password@host:587 (smtps:// for port 465)
                  a Gmail box: smtps://you%40gmail.com:<app password>@smtp.gmail.com:465
and:
  MAIL_TEST_FROM  a sender address validated with that provider
  MAIL_TEST_TO    recipient(s), comma-separated
Or run with --dry-run to build the message without sending it.`)
}

const assetsFlag = flag("assets")?.split("=")[1]
const assets: "cid" | "production" =
  assetsFlag === "cid" || assetsFlag === "production"
    ? assetsFlag
    : transport === "brevo"
      ? "production"
      : "cid"

if (assets === "cid" && transport === "brevo") {
  fail(
    "Brevo's API cannot carry inline (cid:) images. Use --assets=production once the PNGs are deployed, or SMTP_URL with Brevo's SMTP relay."
  )
}

interface Message {
  subject: string
  html: string
  text: string
  fromName: string
}

function fromSample(): Message {
  const { html, text } = renderEmail(
    { envelope: SAMPLE_ENVELOPE, blocks: SAMPLE_BLOCKS },
    { assetBaseUrl: assets === "cid" ? "cid:" : env.assetBase }
  )
  return {
    subject: SAMPLE_ENVELOPE.subject,
    html,
    text,
    fromName: SAMPLE_ENVELOPE.fromName,
  }
}

/**
 * A file exported from the playground. Its images point at whatever served
 * the playground — `localhost` while developing — so they are pointed again,
 * at attachments or at the deployed site.
 */
function fromFile(path: string): Message {
  if (!existsSync(path)) fail(`No such file: ${path}`)

  const source = readFileSync(path, "utf8")
  const html = source.replace(
    /(["'(])https?:\/\/[^"')\s]*?\/email\/([\w-]+\.png)/g,
    (_, quote: string, name: string) =>
      `${quote}${assets === "cid" ? "cid:" : env.assetBase}${name}`
  )
  const decode = (value: string) =>
    value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
  const subject =
    decode(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "") ||
    basename(path, ".html")

  // A plain-text part read off the HTML: links kept, everything hidden dropped.
  const body = html.slice(html.search(/<body/i))
  const text = decode(
    body
      .replace(/<div style="display:none;[\s\S]*?<\/div>/i, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h1|h2|tr|li)>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;|&#847;|&zwnj;|&rarr;/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim()

  return { subject, html, text, fromName: "" }
}

const message = file ? fromFile(file) : fromSample()
const size = new TextEncoder().encode(message.html).length

/** The library files the HTML points at, attached under their own name. */
const inline = [
  ...new Set([...message.html.matchAll(/cid:([\w-]+\.png)/g)].map((m) => m[1])),
]
const attachments = inline.map((name) => {
  const path = join(ASSET_DIR, name)
  if (!existsSync(path)) {
    fail(`${name} is not in public/email/ — run scripts/rasterize-email-media.ts`)
  }
  return { filename: name, path, cid: name, contentDisposition: "inline" as const }
})

/** The unsubscribe link of the footer, offered to the mailbox as a header too. */
const unsubscribe = /href="(https:[^"]+)"[^>]*>[^<]*Unsubscribe/i.exec(
  message.html
)?.[1]
const from = env.from ?? "test@example.com"
const fromName =
  process.env.MAIL_TEST_FROM_NAME?.trim() ||
  env.fromName ||
  message.fromName ||
  "Email builder test"

console.log(`Email builder — test send${dryRun ? " (dry run)" : ""}
  source     ${file ?? "sample newsletter"}
  subject    ${message.subject}
  html       ${formatSize(size)} / ${formatSize(GMAIL_CLIP_LIMIT)}${size >= GMAIL_CLIP_LIMIT ? "  ⚠ Gmail will clip it" : ""}
  images     ${assets === "cid" ? `${attachments.length} inline attachments` : env.assetBase}
  transport  ${
    transport === "brevo"
      ? `Brevo API, key ${maskKey(env.brevoKey!)}`
      : transport === "smtp"
        ? `SMTP ${maskUrl(env.smtpUrl!)}`
        : "none"
  }
  from       ${fromName} <${env.from ?? "(MAIL_TEST_FROM not set)"}>
  to         ${env.to.join(", ") || "(MAIL_TEST_TO not set)"}`)

if (!env.to.length && !dryRun)
  fail("MAIL_TEST_TO is not set: give the recipient(s), comma-separated.")

if (!env.from && !dryRun)
  fail(
    "MAIL_TEST_FROM is not set: the sender must be an address the provider has validated."
  )

/* -------------------------------------------------------------------------- */
/* Images online?                                                             */
/* -------------------------------------------------------------------------- */

if (assets === "production" && !dryRun) {
  const urls = [
    ...new Set([...message.html.matchAll(/src="(https:[^"]+)"/g)].map((m) => m[1])),
  ]
  const missing: string[] = []
  for (const url of urls) {
    const response = await fetch(url, { method: "HEAD" }).catch(() => undefined)
    if (!response?.ok) missing.push(url)
  }
  if (missing.length) {
    fail(
      `These images are not online yet — deploy the site, or send with --assets=cid over SMTP:\n  ${missing.join("\n  ")}`
    )
  }
}

/* -------------------------------------------------------------------------- */
/* Sending                                                                    */
/* -------------------------------------------------------------------------- */

const headers: Record<string, string> = {}
if (unsubscribe || env.from) {
  headers["List-Unsubscribe"] = [
    env.from ? `<mailto:${env.from}?subject=unsubscribe>` : "",
    unsubscribe ? `<${unsubscribe}>` : "",
  ]
    .filter(Boolean)
    .join(", ")
}

if (transport === "brevo" && !dryRun) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.brevoKey!,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: env.from, name: fromName },
      to: env.to.map((email) => ({ email })),
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      headers,
      tags: ["email-builder-test"],
    }),
  })
  const body = await response.text()
  // Brevo echoes nothing secret back, but the body is trimmed all the same.
  if (!response.ok) fail(`Brevo answered ${response.status}: ${body.slice(0, 300)}`)
  console.log(`\n✔ Sent through Brevo — ${body.slice(0, 200)}`)
  process.exit(0)
}

const mailer = dryRun
  ? nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix",
    })
  : nodemailer.createTransport(env.smtpUrl!)

const info = await mailer.sendMail({
  from: { name: fromName, address: from },
  to: env.to,
  subject: message.subject,
  html: message.html,
  text: message.text,
  attachments,
  headers,
})

if (dryRun) {
  const out = join(tmpdir(), `email-builder-test-${Date.now()}.eml`)
  writeFileSync(out, (info as unknown as { message: Buffer }).message)
  console.log(
    `\n✔ Nothing sent. The message is in ${out} — open it in a mail client to look at it.`
  )
} else {
  console.log(`\n✔ Sent over SMTP — ${info.response ?? info.messageId}`)
}
