import { useMemo } from "react"
import type { BuilderBlock } from "@/demo/builder/blocks"
import {
  renderEmail,
  type EmailEnvelope,
  type RenderedEmail,
} from "@/demo/email/renderEmail"

/**
 * The glue between the site and `renderEmail` — the part that is *not* meant to
 * be copied: where this site serves its images, and how a form's fields map
 * onto an envelope.
 */

/**
 * Where `public/email/` is served from, as an absolute URL: the deployed site
 * in production, `localhost` while developing. An HTML exported from a local
 * server therefore points at images no mailbox can reach — the test-send
 * script swaps those for inline attachments.
 */
export function emailAssetBaseUrl(): string {
  const origin =
    typeof window === "undefined"
      ? "https://hermez.dev"
      : window.location.origin
  return new URL(`${import.meta.env.BASE_URL}email/`, origin).href
}

/** The envelope of an email, read off the fields of the form beside `blocks`. */
export function envelopeOf(fields: Record<string, unknown> = {}): EmailEnvelope {
  const text = (value: unknown) => (typeof value === "string" ? value : "")

  return {
    subject: text(fields.subject),
    preheader: text(fields.preheader),
    fromName: text(fields.fromName),
    brandColor: text(fields.brandColor),
  }
}

/** The email the builder holds, rendered once per change. */
export function useRenderedEmail(
  blocks: BuilderBlock[],
  fields?: Record<string, unknown>
): RenderedEmail {
  return useMemo(
    () =>
      renderEmail(
        { envelope: envelopeOf(fields), blocks },
        { assetBaseUrl: emailAssetBaseUrl() }
      ),
    [blocks, fields]
  )
}

/** Saves the HTML as a file, named after the subject. */
export function downloadEmail(html: string, subject = ""): void {
  const name =
    subject
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "email"
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `${name}.html`
  link.click()
  URL.revokeObjectURL(url)
}
