import { afterEach, describe, expect, it } from "vitest"
import { getCollectionItems, getCollectionTotal } from "@/api/collection"
import { configureApi, resetApiConfig } from "@/api/apiConfig"
import { strapiDialect } from "@/api/dialect/strapiDialect"
import { supabaseDialect } from "@/api/dialect/supabaseDialect"
import { jsonLdDialect } from "@/api/dialect/jsonLdDialect"
import { createResourceCollection } from "@/api/collectionShape"
import getIdFromObject from "@/internal/id/getIdFromObject"

afterEach(() => {
  resetApiConfig()
})

describe("reading a list, whatever answered it", () => {
  it("reads a Hydra collection without being told to", () => {
    const collection = {
      "@id": "/api/articles",
      "@type": "Collection",
      member: [{ "@id": "/api/articles/1" }],
      totalItems: 12,
    }

    expect(getCollectionItems(collection)).toHaveLength(1)
    expect(getCollectionTotal(collection)).toBe(12)
  })

  it("reads a Strapi envelope once the application configured that dialect", () => {
    configureApi({ dialect: strapiDialect() })

    const payload = {
      data: [{ id: 1, attributes: { title: "First" } }],
      meta: { pagination: { total: 3 } },
    }

    expect(getCollectionItems(payload)).toEqual([{ id: 1, title: "First" }])
    expect(getCollectionTotal(payload)).toBe(3)
  })

  it("reads the bare array a Supabase table answers with", () => {
    configureApi({ dialect: supabaseDialect() })

    expect(getCollectionItems([{ id: 1 }, { id: 2 }])).toHaveLength(2)
    // Nothing counted it: the pagination hides rather than invent a page count.
    expect(getCollectionTotal([{ id: 1 }])).toBeUndefined()
  })

  it("lets a resource speak a dialect of its own", () => {
    configureApi({ dialect: jsonLdDialect() })

    const resource = { dialect: strapiDialect() }
    const payload = { data: [{ id: 1, attributes: { title: "First" } }], meta: {} }

    expect(getCollectionItems(payload, resource)).toEqual([
      { id: 1, title: "First" },
    ])
    // The configured dialect still reads its own, in the same render.
    expect(getCollectionItems({ member: [{ "@id": "/a/1" }] })).toHaveLength(1)
  })

  it("answers an empty list for a collection that never arrived", () => {
    expect(getCollectionItems(undefined)).toEqual([])
    expect(getCollectionItems(null)).toEqual([])
  })
})

describe("the identity of a record", () => {
  it("is the IRI on a JSON-LD API, and the number behind it in a URL", () => {
    const article = { "@id": "/api/articles/42", id: "42" }

    expect(getIdFromObject(article)).toBe("/api/articles/42")
    expect(getIdFromObject(article, true)).toBe("42")
  })

  it("is the documentId on Strapi", () => {
    configureApi({ dialect: strapiDialect() })

    expect(getIdFromObject({ id: "1", documentId: "kx8f2" })).toBe("kx8f2")
    expect(getIdFromObject({ id: "1", documentId: "kx8f2" }, true)).toBe("kx8f2")
  })

  it("is the primary key on Supabase, whatever it is called", () => {
    configureApi({ dialect: supabaseDialect({ primaryKey: "slug" }) })

    expect(getIdFromObject({ slug: "hello-world", id: "7" })).toBe("hello-world")
  })

  it("follows the resource's own dialect over the configured one", () => {
    configureApi({ dialect: jsonLdDialect() })

    expect(
      getIdFromObject({ documentId: "kx8f2" }, false, { dialect: strapiDialect() })
    ).toBe("kx8f2")
  })
})

describe("reading a list through a custom dialect", () => {
  it("hands the dialect the raw payload, then reads the repository's envelope itself", () => {
    const rows = { rows: [{ uuid: "a" }], count: 7 }
    const dialect = {
      ...jsonLdDialect(),
      name: "my-api",
      readCollection: (payload: any) => ({
        items: payload.rows,
        totalItems: payload.count,
      }),
    }

    expect(getCollectionItems(rows, { dialect })).toEqual([{ uuid: "a" }])

    const envelope = createResourceCollection({
      id: "/rows",
      items: [{ uuid: "a" }],
      totalItems: 7,
    })

    expect(getCollectionItems(envelope, { dialect })).toEqual([{ uuid: "a" }])
    expect(getCollectionTotal(envelope, { dialect })).toBe(7)
  })
})
