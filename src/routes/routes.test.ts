import { describe, expect, it } from "vitest"
import { generateLink, generateLinkByResource, parseLink } from "./routes"
import { ActionList } from "react-data-form"
import { ViewResource } from "@/ViewResource"
import { ViewResourceContextParams } from "@/ViewResourceContext"
import { encodeQuery } from "@/internal/url/urlEncoder"

const fakeResource = {
  "@id": "reset-password-request",
  scope: "auth",
} as ViewResource

describe("generateLink", () => {
  it("builds a plain link from a resourceId and an action", () => {
    const link = generateLink({
      scope: "scope",
      resourceId: "produit",
      resourceAction: ActionList.list,
    })
    expect(link).toBe("/scope/produit/list")
  })

  it("From Resource", () => {
    const link = generateLinkByResource({
      resource: fakeResource,
      resourceAction: ActionList.list,
    })
    expect(link).toBe("/auth/reset-password-request/list")
  })

  it("encodes the id and the filter parameters", () => {
    const link = generateLink({
      resourceId: "produit",
      resourceAction: ActionList.update,
      id: "1234",
      filter: { status: "active" },
    })
    // Sans scope explicite, generateLink retombe sur le scope courant ("public" par défaut).
    expect(link).toBe(
      `/public/produit/update/1234?filter=${encodeQuery({ status: "active" })}`
    )
  })

  it("adds defaultData alongside a filter", () => {
    const link = generateLink({
      scope: "defaultScope",
      resourceId: "produit",
      resourceAction: ActionList.create,
      filter: { a: 1 },
      defaultData: { b: 2 },
    })
    expect(link).toBe(
      `/defaultScope/produit/create?filter=${encodeQuery({ a: 1 })}&defaultData=${encodeQuery({ b: 2 })}`
    )
  })

  it("adds defaultData alone when there is no filter", () => {
    const link = generateLink({
      resourceId: "produit",
      resourceAction: ActionList.create,
      defaultData: { test: true },
    })
    expect(link).toBe(
      `/public/produit/create?defaultData=${encodeQuery({ test: true })}`
    )
  })

  it("does not add defaultData outside the create action", () => {
    const link = generateLink({
      resourceId: "produit",
      resourceAction: ActionList.update,
      id: "1234",
      defaultData: { test: true },
    })
    expect(link).toBe("/public/produit/update/1234")
  })

  it("adds defaultData when the child is being created", () => {
    const link = generateLink({
      resourceId: "company",
      resourceAction: ActionList.read,
      id: "1",
      defaultData: { company: "/api/companies/1" },
      childViewResource: {
        resourceId: "booking",
        resourceAction: ActionList.create,
      },
    })
    expect(link).toBe(
      `/public/company/read/1/booking/create?defaultData=${encodeQuery({ company: "/api/companies/1" })}`
    )
  })

  it("leaves data out of the URL, since it is not serialised", () => {
    const link = generateLink({
      resourceId: "produit",
      resourceAction: ActionList.create,
      data: { ignored: true },
    })
    expect(link).toBe("/public/produit/create")
  })

  it("adds subResource when given", () => {
    const link = generateLink({
      resourceId: "produit",
      resourceAction: ActionList.list,
      subResource: "subName",
    })
    expect(link).toBe("/public/produit/list/subName")
  })

  it("uses the custom scope when one is given", () => {
    const link = generateLink({
      resourceId: "commande",
      resourceAction: ActionList.read,
      scope: "customScope",
    })
    expect(link.startsWith("/customScope")).toBe(true)
  })
})

describe("parseLink", () => {
  it.each([
    ["filter", "oops"],
    ["filter", "%7B%22a%22"],
    ["defaultData", "oops"],
    ["defaultData", "%7B%22a%22"],
  ])("ignores a malformed ?%s=%s instead of throwing", (key, value) => {
    expect(parseLink(`/admin/articles/list?${key}=${value}`)).toEqual({
      scope: "admin",
      resourceId: "articles",
      resourceAction: ActionList.list,
    })
  })

  it("parses a plain link with scope, resourceId and action", () => {
    const params = parseLink("/pro/animals/list")
    expect(params).toEqual({
      scope: "pro",
      resourceId: "animals",
      resourceAction: ActionList.list,
    })
  })

  it("parses a link carrying an id", () => {
    const params = parseLink("/pro/animals/update/abc-123")
    expect(params).toEqual({
      scope: "pro",
      resourceId: "animals",
      resourceAction: ActionList.update,
      id: "abc-123",
    })
  })

  it("parses a link carrying a subResource", () => {
    const params = parseLink("/pro/animals/list/abc-123/photos")
    expect(params).toEqual({
      scope: "pro",
      resourceId: "animals",
      resourceAction: ActionList.list,
      id: "abc-123",
      subResource: "photos",
    })
  })

  it("parses a link carrying a filter", () => {
    const link = generateLink({
      scope: "pro",
      resourceId: "animals",
      resourceAction: ActionList.list,
      filter: { status: "active" },
    })
    const params = parseLink(link)
    expect(params.filter).toEqual({ status: "active" })
    expect(params.scope).toBe("pro")
    expect(params.resourceId).toBe("animals")
  })

  it("parses a link carrying defaultData", () => {
    const link = generateLink({
      scope: "pro",
      resourceId: "animals",
      resourceAction: ActionList.create,
      defaultData: { foo: "bar" },
    })
    const params = parseLink(link)
    expect(params.defaultData).toEqual({ foo: "bar" })
    expect(params.data).toBeUndefined()
  })

  it("attaches defaultData to the child being created", () => {
    const link = generateLink({
      scope: "public",
      resourceId: "company",
      resourceAction: ActionList.read,
      id: "1",
      defaultData: { company: "/api/companies/1" },
      childViewResource: {
        resourceId: "booking",
        resourceAction: ActionList.create,
      },
    })
    const params = parseLink(link)
    expect(params.defaultData).toBeUndefined()
    expect(params.childViewResource?.defaultData).toEqual({
      company: "/api/companies/1",
    })
  })

  it("parses a link carrying both a filter and defaultData", () => {
    const link = generateLink({
      scope: "pro",
      resourceId: "animals",
      resourceAction: ActionList.create,
      filter: { a: 1 },
      defaultData: { b: 2 },
    })
    const params = parseLink(link)
    expect(params.filter).toEqual({ a: 1 })
    expect(params.defaultData).toEqual({ b: 2 })
  })

  it("is the exact inverse of generateLink", () => {
    const original = {
      scope: "user",
      resourceId: "appointments",
      resourceAction: ActionList.update,
      id: "xyz-789",
    }
    const link = generateLink(original)
    const parsed = parseLink(link)
    expect(parsed).toEqual(original)
  })

  it("is the exact inverse of generateLink with defaultData, on the create action", () => {
    const original: ViewResourceContextParams = {
      scope: "pro",
      resourceId: "bookings",
      resourceAction: ActionList.create,
      defaultData: { startDate: "2026-01-01", roomId: "abc" },
    }
    const link = generateLink(original)
    const parsed = parseLink(link)
    expect(parsed).toEqual(original)
  })

  it("is the exact inverse of generateLink with subResource and childViewResource", () => {
    const original: ViewResourceContextParams = {
      scope: "user",
      resourceId: "appointments",
      resourceAction: ActionList.read,
      id: "xyz-789",
      subResource: "invoices",
      childViewResource: {
        resourceId: "appointments-booking",
        resourceAction: ActionList.update,
        id: "xyz-789-sub",
      },
    }
    const link = generateLink(original)
    expect(link).toEqual(
      "/user/appointments/read/xyz-789/invoices/appointments-booking/update/xyz-789-sub"
    )

    const parsed = parseLink(link)
    expect(parsed).toEqual(original)
  })

  it("is the exact inverse of generateLink with a record opened over a list", () => {
    const original: ViewResourceContextParams = {
      scope: "admin",
      resourceId: "admin_tasks",
      resourceAction: ActionList.list,
      viewVariantId: "board",
      childViewResource: {
        resourceId: "admin_tasks",
        resourceAction: ActionList.read,
        id: "12",
      },
    }
    const link = generateLink(original)
    expect(link).toEqual("/admin/admin_tasks/list/admin_tasks/read/12?variant=board")

    expect(parseLink(link)).toEqual(original)
  })

  it("still reads the id of a split list followed by a sub-resource", () => {
    expect(parseLink("/admin/posts/list/42/comments")).toEqual({
      scope: "admin",
      resourceId: "posts",
      resourceAction: ActionList.list,
      id: "42",
      subResource: "comments",
    })
  })

  it("is the exact inverse of generateLink with a childViewResourceContext", () => {
    const original: ViewResourceContextParams = {
      scope: "user",
      resourceId: "appointments",
      resourceAction: ActionList.read,
      id: "xyz-789",
      childViewResource: {
        resourceId: "appointments-booking",
        id: "xyz-789-sub",
        resourceAction: ActionList.update,
      },
    }
    const link = generateLink(original)
    expect(
      "/user/appointments/read/xyz-789/appointments-booking/update/xyz-789-sub"
    ).toEqual(link)

    const parsed = parseLink(link)
    expect(parsed).toEqual(original)
  })
})

describe("the chosen layout", () => {
  it("travels with the link", () => {
    // A list navigating to itself — the split view selecting a row — must say
    // which layout it is in, or the reader lands back in the first one.
    expect(
      generateLink({
        scope: "admin",
        resourceId: "articles",
        resourceAction: ActionList.list,
        id: "42",
        viewVariantId: "split",
      })
    ).toBe("/admin/articles/list/42?variant=split")
  })

  it("is read back", () => {
    expect(parseLink("admin/articles/list/42?variant=split")).toMatchObject({
      resourceAction: ActionList.list,
      id: "42",
      viewVariantId: "split",
    })
  })

  it("is left out when the caller names none", () => {
    expect(
      generateLink({
        scope: "admin",
        resourceId: "articles",
        resourceAction: ActionList.list,
      })
    ).toBe("/admin/articles/list")
  })
})
