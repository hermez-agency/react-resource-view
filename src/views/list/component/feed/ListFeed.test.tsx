import { afterEach, describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { Bell } from "lucide-react"
import { createViewResource } from "@/utils/createViewResource"
import ResourceViewProvider from "@/provider/ResourceViewProvider"
import { layout } from "@/layout/layout"

afterEach(() => localStorage.clear())

const iso = (daysAgo: number, hour = 10) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function setup(
  id: string,
  member: Record<string, unknown>[],
  order?: "asc" | "desc"
) {
  const activity = createViewResource<any>(id, {
    name: "Activity",
    storage: "local",
    titleField: "summary",
    form: { inputs: { summary: { label: "Summary" } } },
    views: {
      list: {
        layouts: [
          layout.feed({
            descriptionField: "detail",
            actorField: "actor",
            avatarField: "avatar",
            typeField: "kind",
            types: { alert: { icon: Bell, color: "red" } },
            order,
          }),
        ],
      },
    },
  })
  localStorage.setItem(
    id,
    JSON.stringify({
      "@id": id,
      "@type": "Collection",
      member: member.map((entry, i) => ({
        "@id": `/${id}/${i + 1}`,
        "@type": id,
        id: String(i + 1),
        ...entry,
      })),
      totalItems: member.length,
    })
  )
  return render(
    <ResourceViewProvider
      viewResourceContextParams={{ scope: "journal", resourceId: id }}
      configuration={{ resources: [activity], defaultScope: "journal" }}
    />
  )
}

describe("layout.feed", () => {
  it("gathers the events by day, the most recent first, under readable headings", async () => {
    setup("feed_days", [
      { summary: "Old one", createdAt: iso(5) },
      { summary: "Fresh one", createdAt: iso(0, 9) },
      { summary: "Yesterday one", createdAt: iso(1) },
    ])
    await screen.findByText("Fresh one")

    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument()
    const headings = screen.getAllByRole("heading", { level: 3 })
    expect(headings).toHaveLength(3)
    expect(headings[0]).toHaveTextContent("Today")

    // A list of days, each holding a list of events.
    const today = headings[0].closest("li")!
    expect(within(today).getAllByRole("listitem")).toHaveLength(1)
    const titles = screen.getAllByText(/one$/).map((element) => element.textContent)
    expect(titles).toEqual(["Fresh one", "Yesterday one", "Old one"])
  })

  it("writes the date for a screen reader, and the full date on hover", async () => {
    const { container } = setup("feed_time", [
      { summary: "Deployed", createdAt: iso(0) },
    ])
    await screen.findByText("Deployed")

    const time = container.querySelector("time")!
    expect(time).toHaveAttribute("datetime", expect.stringMatching(/^\d{4}-/))
    expect(time).toHaveAttribute("title")
    expect(time.querySelector(".sr-only")?.textContent).toBe(
      time.getAttribute("title")
    )
  })

  it("shows the description, the actor and its initials, and the type's marker", async () => {
    const { container } = setup("feed_extras", [
      {
        summary: "Server down",
        detail: "Paged the team",
        actor: { name: "Ada Lovelace" },
        kind: "alert",
        createdAt: iso(0),
      },
      {
        summary: "Photo",
        actor: "Bob",
        avatar: "/bob.png",
        createdAt: iso(0, 8),
      },
    ])
    await screen.findByText("Server down")

    expect(screen.getByText("Paged the team")).toBeInTheDocument()
    expect(screen.getByText("AL")).toBeInTheDocument()
    expect(container.querySelector('img[src="/bob.png"]')).not.toBeNull()
    const marker = container.querySelector<HTMLElement>("[data-feed-marker]")!
    expect(marker.style.color).toBe("red")
    expect(marker.querySelector("svg")).not.toBeNull()
  })

  it("makes the title the link opening the record", async () => {
    setup("feed_link", [{ summary: "Open me", createdAt: iso(0) }])
    const link = await screen.findByRole("link", { name: "Open me" })

    expect(link.getAttribute("href")).toContain("feed_link")
  })

  it("reads oldest first with order asc", async () => {
    setup(
      "feed_asc",
      [
        { summary: "Second", createdAt: iso(0) },
        { summary: "First", createdAt: iso(3) },
      ],
      "asc"
    )
    await screen.findByText("Second")

    const titles = screen.getAllByText(/^(First|Second)$/).map((e) => e.textContent)
    expect(titles).toEqual(["First", "Second"])
  })

  it("puts the records without a date at the end, under a heading of their own", async () => {
    setup("feed_nodate", [
      { summary: "Floating" },
      { summary: "Dated", createdAt: iso(0) },
    ])
    await screen.findByText("Floating")

    const headings = screen.getAllByRole("heading", { level: 3 })
    expect(headings[headings.length - 1]).toHaveTextContent("No date")
  })
})
