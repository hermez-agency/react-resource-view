import { describe, expect, it } from "vitest"
import { isIdOfResource } from "@/internal/id/isIdOfResource"

const books = { path: "/api/books" }

describe("isIdOfResource", () => {
  it("takes an identifier without a slash", () => {
    expect(isIdOfResource("42", books)).toBe(true)
    expect(isIdOfResource(42, books)).toBe(true)
    expect(isIdOfResource(undefined, books)).toBe(true)
  })

  it("takes an IRI one segment under the resource's path", () => {
    expect(isIdOfResource("/api/books/42", books)).toBe(true)
    expect(isIdOfResource("/api/books/42", { path: "/api/books/" })).toBe(true)
  })

  it("refuses the IRI of another resource", () => {
    expect(isIdOfResource("/api/users/1", books)).toBe(false)
    expect(isIdOfResource("/api/booksellers/1", books)).toBe(false)
  })

  it("refuses an IRI that climbs out of the resource's path", () => {
    expect(isIdOfResource("/api/books/../users/1", books)).toBe(false)
    expect(isIdOfResource("/api/books/..", books)).toBe(false)
    expect(isIdOfResource("/api/books/1\\..\\..\\users\\1", books)).toBe(false)
    expect(isIdOfResource("/api/books/", books)).toBe(false)
  })

  it("takes any IRI of a resource without a path, which calls no URL", () => {
    expect(isIdOfResource("/books/1", { path: undefined })).toBe(true)
    expect(isIdOfResource("https://evil.example/books/1", {})).toBe(false)
  })

  it("refuses an absolute URL, even under the resource's path", () => {
    expect(isIdOfResource("https://evil.example/api/books/1", books)).toBe(false)
    expect(isIdOfResource("//evil.example/api/books/1", books)).toBe(false)
    expect(
      isIdOfResource("https://evil.example/api/books/1", {
        path: "https://evil.example/api/books",
      })
    ).toBe(false)
  })
})
