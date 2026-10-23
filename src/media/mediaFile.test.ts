import { describe, expect, it } from "vitest"
import {
  acceptsFile,
  checkMediaFile,
  dataUrlToFile,
  formatFileSize,
  isImageDataUrl,
  isMediaFileList,
  mimeTypeOf,
  storeAsDataUrl,
} from "@/media/mediaFile"

describe("acceptsFile", () => {
  const pdf = { name: "Kbis.PDF", type: "application/pdf" }

  it("takes everything when no list is given", () => {
    expect(acceptsFile(pdf)).toBe(true)
    expect(acceptsFile(pdf, [])).toBe(true)
  })

  it("matches a MIME type, a family or an extension", () => {
    expect(acceptsFile(pdf, ["application/pdf"])).toBe(true)
    expect(acceptsFile({ name: "a.png", type: "image/png" }, ["image/*"])).toBe(true)
    expect(acceptsFile(pdf, [".pdf"])).toBe(true)
    expect(acceptsFile(pdf, ["image/*", ".docx"])).toBe(false)
  })
})

describe("checkMediaFile", () => {
  it("says why a file is refused, and nothing when it is taken", () => {
    const file = { name: "photo.png", type: "image/png", size: 3 * 1024 * 1024 }

    expect(checkMediaFile(file, { accept: ["application/pdf"] })).toBe(
      "photo.png is not an accepted file type (application/pdf)."
    )
    expect(checkMediaFile(file, { maxSize: 1024 * 1024 })).toBe(
      "photo.png is too large: 1 MB maximum."
    )
    expect(checkMediaFile(file, { accept: ["image/*"] })).toBeUndefined()
  })
})

describe("formatFileSize", () => {
  it("rounds to the unit that reads best", () => {
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(1536)).toBe("1.5 KB")
    expect(formatFileSize(20 * 1024 * 1024)).toBe("20 MB")
  })
})

describe("data URLs", () => {
  it("stores a file as a data URL and reads it back as a file", async () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" })
    const url = await storeAsDataUrl(file)

    expect(url).toBe("data:text/plain;base64,aGVsbG8=")

    const back = dataUrlToFile(url, "again.txt")
    expect(back.name).toBe("again.txt")
    expect(back.type).toBe("text/plain")
    expect(await back.text()).toBe("hello")
  })

  it("recognises what the media inputs store", () => {
    expect(isImageDataUrl("data:image/png;base64,AAAA")).toBe(true)
    expect(isImageDataUrl("data:application/pdf;base64,AAAA")).toBe(false)
    expect(
      isMediaFileList([{ name: "a.pdf", type: "", size: 1, url: "data:," }])
    ).toBe(true)
    expect(isMediaFileList([])).toBe(false)
    expect(isMediaFileList(["a", "b"])).toBe(false)
    expect(mimeTypeOf({ type: "", url: "data:application/pdf;base64,AAAA" })).toBe(
      "application/pdf"
    )
  })
})
