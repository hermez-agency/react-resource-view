import { describe, expect, it } from "vitest"
import { messages } from "./messages"
import { missingKeys } from "./missingKeys"

describe("missingKeys", () => {
  it("lists nothing for a dictionary that translates every key", () => {
    const everything = Object.fromEntries(
      Object.keys(messages).map((key) => [key, key])
    )

    expect(missingKeys(everything)).toEqual([])
  })

  it("lists the keys without an entry and those with an empty one", () => {
    const missing = missingKeys({ Saved: "Enregistré", Cancel: "" })

    expect(missing).not.toContain("Saved")
    expect(missing).toContain("Cancel")
    expect(missing).toContain("Deleted")
    expect(missing).toHaveLength(Object.keys(messages).length - 1)
  })
})
