import { describe, expect, it } from "vitest"
import {
  EMAIL_BUTTON,
  EMAIL_IMAGE,
  EMAIL_TEXT,
  GMAIL_CLIP_LIMIT,
  renderEmail,
  safeUrl,
  sanitizeRichText,
  type EmailBlock,
} from "@/demo/email/renderEmail"
import { SAMPLE_BLOCKS, SAMPLE_ENVELOPE } from "@/demo/email/sample"

const BASE = "https://hermez.dev/react-resource-view/email/"

const sample = () =>
  renderEmail(
    { envelope: SAMPLE_ENVELOPE, blocks: SAMPLE_BLOCKS },
    { assetBaseUrl: BASE }
  )

const tags = (html: string, name: string) =>
  html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? []

const attr = (tag: string, name: string) =>
  new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1]

describe("renderEmail", () => {
  it("never ships SVG or data: URIs", () => {
    const { html } = renderEmail(
      {
        envelope: SAMPLE_ENVELOPE,
        blocks: [
          ...SAMPLE_BLOCKS,
          {
            type: EMAIL_IMAGE,
            image: "data:image/svg+xml,%3Csvg%3E",
            caption: "Upload",
          },
          {
            type: EMAIL_IMAGE,
            image: "https://example.com/logo.svg",
            caption: "Logo",
          },
        ],
      },
      { assetBaseUrl: BASE }
    )

    expect(html).not.toMatch(/<svg/i)
    expect(html).not.toMatch(/data:/i)
    expect(html).not.toMatch(/\.svg/i)
  })

  it("points every image and every link at an absolute URL", () => {
    const { html } = sample()
    const sources = tags(html, "img").map((tag) => attr(tag, "src"))
    const links = [...tags(html, "a"), ...tags(html, "v:roundrect")].map((tag) =>
      attr(tag, "href")
    )

    expect(sources.length).toBeGreaterThan(3)
    expect(links.length).toBeGreaterThan(3)
    for (const url of [...sources, ...links]) {
      expect(url).toMatch(/^(https:\/\/|mailto:)/)
    }
    for (const src of sources) expect(src).toMatch(/\.png$/)
  })

  it("serves the library from cid: attachments when asked to", () => {
    const { html } = renderEmail(
      { envelope: SAMPLE_ENVELOPE, blocks: SAMPLE_BLOCKS },
      { assetBaseUrl: "cid:" }
    )
    for (const tag of tags(html, "img"))
      expect(attr(tag, "src")).toMatch(/^cid:[\w-]+\.png$/)
  })

  it("refuses a relative asset base", () => {
    expect(() =>
      renderEmail({ envelope: {}, blocks: [] }, { assetBaseUrl: "/email/" })
    ).toThrow(/absolute/)
  })

  it("gives every image an alt, a width and a height", () => {
    for (const tag of tags(sample().html, "img")) {
      expect(tag).toMatch(/\salt="[^"]*"/)
      expect(Number(attr(tag, "width"))).toBeGreaterThan(0)
      expect(Number(attr(tag, "height"))).toBeGreaterThan(0)
    }
  })

  it("lays the message out in a 600px column, in tables", () => {
    const { html } = sample()

    expect(html).toContain("max-width:600px")
    // The phone breakpoint of the <style> is a max-width too, of the window.
    const markup = html.replace(/<style>[\s\S]*?<\/style>/, "")
    const widths = [...markup.matchAll(/(?:\swidth="|max-width:)(\d+)/g)].map((m) =>
      Number(m[1])
    )
    expect(Math.max(...widths)).toBe(600)
    expect(html).not.toMatch(/display:\s*(flex|grid)/)
    expect(tags(html, "table").every((tag) => /role="presentation"/.test(tag))).toBe(
      true
    )
    expect(tags(html, "style")).toHaveLength(1)
  })

  it("declares both colour schemes", () => {
    const { html } = sample()
    expect(html).toContain('<meta name="color-scheme" content="light dark">')
    expect(html).toContain(
      '<meta name="supported-color-schemes" content="light dark">'
    )
    expect(html).toContain("prefers-color-scheme:dark")
  })

  it("hides the preheader at the top of the body and writes a text part", () => {
    const { html, text } = sample()
    const body = html.slice(html.indexOf("<body"))

    expect(body.indexOf(SAMPLE_ENVELOPE.preheader.slice(0, 20))).toBeLessThan(400)
    expect(body).toMatch(/<div style="display:none;[^"]*mso-hide:all;/)

    expect(text).toContain("OCTOBER'S NEW ROAST")
    expect(text).toContain("Order Sunrise: https://hermez.dev/")
    expect(text).toContain("Unsubscribe: https://hermez.dev/")
    expect(text).not.toMatch(/<[a-z]/i)
  })

  it("escapes the subject, the preheader and every plain field", () => {
    const attack = `<script>alert("x")</script>`
    const { html, text } = renderEmail(
      {
        envelope: {
          subject: attack,
          preheader: attack,
          brandColor: `red;"><script>`,
        },
        blocks: [
          { type: EMAIL_BUTTON, label: attack, url: "javascript:alert(1)" },
          { type: EMAIL_TEXT, title: `"><img src=x onerror=alert(1)>`, body: "" },
        ],
      },
      { assetBaseUrl: BASE }
    )

    expect(html).not.toContain("<script")
    expect(html).not.toMatch(/<img src=x/)
    expect(html).not.toContain("javascript:")
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;")
    // An unusable brand colour falls back rather than breaking out of the style.
    expect(html).toContain("background:#7c2d12")
    expect(text).toContain(attack)
  })

  it("keeps the rich text to a safe subset, styled inline", () => {
    const theme = { brand: "#7c2d12", link: "#7c2d12" }
    const html = sanitizeRichText(
      `<h2 class="x">Title</h2><p onclick="steal()">Hello <b>bold</b> <i>it</i>` +
        ` <a href="javascript:alert(1)">bad</a> <a href="https://example.com" onmouseover="x">good</a>` +
        `<script>alert(1)</script><img src="x" onerror="alert(1)"><iframe src="https://evil"></iframe>` +
        `<span style="color:red">kept</span></p><ul><li><p>one</p></li><li>two</li></ul><table><tr><td>cell`,
      theme
    )

    expect(html).not.toMatch(/<(script|img|iframe|span|table|td|h2)\b/)
    expect(html).not.toMatch(/onclick|onerror|onmouseover|javascript:|class="x"/)
    expect(html).not.toContain("alert(1)")
    expect(html).toContain(
      '<a class="em-link" href="https://example.com/" target="_blank" style="color:#7c2d12;'
    )
    expect(html).toContain("bad")
    expect(html).toContain("kept")
    expect(html).toContain("cell")
    expect(html).toMatch(/<strong style="font-weight:bold;">bold<\/strong>/)
    expect(html).toMatch(/<em style="font-style:italic;">it<\/em>/)
    expect(html).toMatch(/<li style="margin:0 0 6px;">one<\/li>/)
    for (const tag of html.match(/<(p|ul|li)\b[^>]*>/g) ?? [])
      expect(tag).toContain("style=")

    // Balanced, whatever came in.
    const opened = html.match(/<(p|ul|ol|li|a|strong|em)\b/g)?.length ?? 0
    const closed = html.match(/<\/(p|ul|ol|li|a|strong|em)>/g)?.length ?? 0
    expect(opened).toBe(closed)
  })

  it("only accepts links a mailbox can follow", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1")
    expect(safeUrl("www.example.com")).toBe("https://www.example.com/")
    expect(safeUrl("mailto:hello@example.com")).toBe("mailto:hello@example.com")
    expect(safeUrl("/relative")).toBeUndefined()
    expect(safeUrl("javascript:alert(1)")).toBeUndefined()
    expect(safeUrl("data:text/html,x")).toBeUndefined()
  })

  it("stays well under the weight at which Gmail clips a message", () => {
    const { html, size } = sample()
    expect(size).toBe(new TextEncoder().encode(html).length)
    expect(size).toBeLessThan(GMAIL_CLIP_LIMIT)

    // Twenty sections are still a newsletter rather than a clipped one.
    const long: EmailBlock[] = Array.from({ length: 4 }, () => SAMPLE_BLOCKS).flat()
    expect(
      renderEmail(
        { envelope: SAMPLE_ENVELOPE, blocks: long },
        { assetBaseUrl: BASE }
      ).size
    ).toBeLessThan(GMAIL_CLIP_LIMIT)
  })
})
