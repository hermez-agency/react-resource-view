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
