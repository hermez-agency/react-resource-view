import { describe, expect, it } from "vitest"
import { jsonLdDialect } from "@/api/dialect/jsonLdDialect"

const dialect = jsonLdDialect()

describe("the JSON-LD dialect's errors", () => {
  it("reads API Platform 3's hydra-prefixed error", () => {
    expect(
      dialect.normalizeError(
        {
          "@context": "/api/contexts/Error",
          "@type": "hydra:Error",
          "hydra:title": "An error occurred",
          "hydra:description": "Slot no longer available",
        },
        400
      )
    ).toEqual({
      status: 400,
      title: "An error occurred",
      detail: "Slot no longer available",
      violations: undefined,
    })
  })

  it("reads the hydra-prefixed violations of a validation error", () => {
    const violations = [
      { propertyPath: "title", message: "This value is required." },
    ]

    expect(
      dialect.normalizeError(
        {
          "@type": "ConstraintViolationList",
          "hydra:title": "An error occurred",
          "hydra:description": "title: This value is required.",
          violations,
        },
        422
      )?.violations
    ).toEqual(violations)

    expect(
      dialect.normalizeError({ "hydra:violations": violations }, 422)?.violations
    ).toEqual(violations)
  })

  it("keeps reading the unprefixed keys", () => {
    expect(
      dialect.normalizeError({ title: "Bad", detail: "Nope", status: 409 }, 400)
    ).toMatchObject({ status: 409, title: "Bad", detail: "Nope" })
  })
})

describe("the JSON-LD dialect's identifiers", () => {
  it("always returns strings, even for the numeric id of a plain REST API", () => {
    expect(dialect.getId({ id: 5 })).toBe("5")
    expect(dialect.getIdentifier({ id: 5 })).toBe("5")
    expect(dialect.getId({ id: 0 })).toBe("0")
    expect(dialect.getId({})).toBeUndefined()
    expect(dialect.getIdentifier({ id: null })).toBeUndefined()
  })

  it("prefers the IRI, and keeps the short form of it as identifier", () => {
    expect(dialect.getId({ "@id": "/tasks/5", id: 9 })).toBe("/tasks/5")
    expect(dialect.getIdentifier({ "@id": "/tasks/5", id: 9 })).toBe("5")
  })
})

describe("the JSON-LD dialect's item URL", () => {
  it("calls an IRI as it stands", () => {
    expect(
      dialect.buildRequest({
        name: "getItem",
        path: "/api/books",
        id: "/api/books/1",
      }).url
    ).toBe("/api/books/1")
  })

  it("never calls an absolute URL given as an id", () => {
    const { url } = dialect.buildRequest({
      name: "getItem",
      path: "/api/books",
      id: "https://evil.example/api/books/1",
    })

    expect(url).toBe("/api/books/https%3A%2F%2Fevil.example%2Fapi%2Fbooks%2F1")
  })
})
