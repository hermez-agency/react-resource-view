import { describe, expect, it } from "vitest"
import { htmlToMarkdown } from "./html-to-markdown.ts"

const convert = (html: string) =>
  htmlToMarkdown(html, { origin: "https://hermez.dev" })

describe("htmlToMarkdown", () => {
  it("keeps headings without the hover anchor, and inline marks", () => {
    expect(
      convert(
        '<h2 id="a"><a href="#a">Title<span class="ml-2 opacity-0">#</span></a></h2>' +
          "<p>Use <code>a&lt;b&gt;</code>, <strong>bold</strong> and <em>soft</em>.</p>"
      )
    ).toBe("## Title\n\nUse `a<b>`, **bold** and *soft*.")
  })

  it("keeps code samples whole, dropping the copy button and the markup", () => {
    const html =
      '<div><button><svg><path d="M1"></path></svg></button><pre class="shiki"><code>' +
      '<span class="line"><span>const a = 1 &#x3C; 2</span></span>\n' +
      '<span class="line"><span>  b()</span></span></code></pre></div>'
    expect(convert(html)).toBe("```\nconst a = 1 < 2\n  b()\n```")
  })

  it("makes site links absolute and drops same-page anchors", () => {
    expect(
      convert('<p><a href="/docs/x/">X</a> and <a href="#here">here</a></p>')
    ).toBe("[X](https://hermez.dev/docs/x/) and here")
  })

  it("writes lists and tables", () => {
    expect(convert("<ul><li>one</li><li>two <code>x</code></li></ul>")).toBe(
      "- one\n- two `x`"
    )
    expect(
      convert(
        "<table><thead><tr><th>Name</th><th>Type</th></tr></thead>" +
          "<tbody><tr><td><code>a</code></td><td>A | B</td></tr></tbody></table>"
      )
    ).toBe("| Name | Type |\n| --- | --- |\n| `a` | A \\| B |")
  })
})
