import { describe, expect, it } from "vitest"
import * as publicApi from "@/index"

describe("public API", () => {
  // Freezes the runtime names the package exports. Adding or removing one
  // changes the snapshot: update it on purpose, and mention a removal in the
  // changeset with the major version it needs.
  it("exports exactly the names in the snapshot", () => {
    expect(Object.keys(publicApi).sort()).toMatchSnapshot()
  })
})
