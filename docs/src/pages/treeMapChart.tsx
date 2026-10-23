import { ActionList } from "react-data-form"
import {
  createViewResource,
  layout,
  ViewResourceContextProvider,
} from "react-resource-view"
import { ChartColumn } from "lucide-react"
import { CodeBlock, LiveExample, PageHeader, Section } from "../DocLayout"

interface Team {
  "@id": string
  "@type": string
  id: string
  name: string
  lead: string
  parent?: string
}

interface Shop {
  "@id": string
  "@type": string
  id: string
  name: string
  city: string
  latitude: number
  longitude: number
}

interface Order {
  "@id": string
  "@type": string
  id: string
  reference: string
  status: "pending" | "paid" | "refunded"
  total: number
  placedAt: string
}

const team = (id: number, name: string, lead: string, parent?: number): Team => ({
  "@id": `/api/teams/${id}`,
  "@type": "Team",
  id: String(id),
  name,
  lead,
  parent: parent ? `/api/teams/${parent}` : undefined,
})

const TEAMS: Team[] = [
  team(1, "Engineering", "Ada"),
  team(2, "Frontend", "Grace", 1),
  team(3, "Design system", "Alan", 2),
  team(4, "Backend", "Linus", 1),
  team(5, "Sales", "Margaret"),
  team(6, "Partnerships", "Katherine", 5),
]

const shop = (
  id: number,
  name: string,
  city: string,
  latitude: number,
  longitude: number
): Shop => ({
  "@id": `/api/shops/${id}`,
  "@type": "Shop",
  id: String(id),
  name,
  city,
  latitude,
  longitude,
})

const SHOPS: Shop[] = [
  shop(1, "Rivoli", "Paris", 48.8606, 2.3376),
  shop(2, "Presqu'île", "Lyon", 45.7597, 4.8343),
  shop(3, "Vieux-Port", "Marseille", 43.2951, 5.3744),
  shop(4, "Capitole", "Toulouse", 43.6045, 1.444),
  shop(5, "Chartrons", "Bordeaux", 44.8531, -0.5703),
]

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
]

const ORDERS: Order[] = [
  ["pending", 64, "2026-01-08"],
  ["paid", 120, "2026-01-14"],
  ["paid", 86, "2026-02-03"],
  ["paid", 240, "2026-02-21"],
  ["refunded", 40, "2026-03-02"],
  ["paid", 150, "2026-04-11"],
  ["paid", 92, "2026-04-19"],
  ["pending", 58, "2026-05-06"],
].map(([status, total, placedAt], index) => ({
  "@id": `/api/orders/${index + 1}`,
  "@type": "Order",
  id: String(index + 1),
  reference: `#${1040 + index}`,
  status: status as Order["status"],
  total: total as number,
  placedAt: placedAt as string,
}))

export const teamsResource = createViewResource<Team>("demo_teams", {
  name: "Teams",
  storage: { type: "local", seed: TEAMS },
  titleField: "name",
  form: {
    inputs: {
      name: { label: "Name", required: true },
      lead: { label: "Lead" },
    },
  },
  views: {
    list: { layouts: [layout.tree({ parentField: "parent" }), layout.table()] },
  },
})

export const shopsResource = createViewResource<Shop>("demo_shops", {
  name: "Shops",
  storage: { type: "local", seed: SHOPS },
  form: {
    inputs: {
      name: { label: "Name", required: true },
      city: { label: "City" },
    },
  },
  views: {
    list: {
      layouts: [layout.map({ height: 360 }), layout.table()],
      rowActions: ["read"],
    },
  },
})

const euros = new Intl.NumberFormat("en", { style: "currency", currency: "EUR" })

export const ordersResource = createViewResource<Order>("demo_orders", {
  name: "Orders",
  storage: { type: "local", seed: ORDERS },
  titleField: "reference",
  form: {
    inputs: {
      reference: { label: "Reference" },
      status: { label: "Status" },
      total: { label: "Total" },
    },
  },
  views: {
    list: {
      layouts: [
        layout.chart({
          label: "By status",
          groupBy: "status",
          groups: STATUSES,
          valueField: "total",
          valueLabel: "revenue",
          format: (n) => euros.format(n),
        }),
        layout.chart({
          id: "monthly",
          label: "By month",
          dateField: "placedAt",
          interval: "month",
        }),
        layout.table(),
      ],
    },
  },
})

const treeMapChartResource = createViewResource("tree-map-chart", {
  name: "Tree, map and chart",
  icon: ChartColumn,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Tree, map and chart"
          intro="Three more ways to lay a list out: records under their parent, records on a map, and figures over the records. Like every layout, none of them knows which API the records came from."
        />

        <Section
          title="layout.tree()"
          intro="Each record under the record its parentField points at — an IRI, an identifier, or the parent object itself."
        >
          <CodeBlock>{tree}</CodeBlock>
          <LiveExample label="layout.tree(), on teams">
            <ViewResourceContextProvider
              resource={teamsResource}
              resourceAction={ActionList.list}
              scope="docs"
            />
          </LiveExample>
          <p>
            Only the page on screen is arranged: a record whose parent is filtered
            out or on another page is a root, so it never disappears. Raise{" "}
            <code>pageSize</code> for a tree meant to be seen whole. Branches can be
            folded one by one or all at once; <code>defaultExpanded: false</code>{" "}
            starts them folded.
          </p>
        </Section>

        <Section
          title="layout.map()"
          intro="A marker per record with a position, read from two fields — or from getPosition."
        >
          <CodeBlock>{map}</CodeBlock>
          <LiveExample label="layout.map(), on shops">
            <ViewResourceContextProvider
              resource={shopsResource}
              resourceAction={ActionList.list}
              scope="docs"
            />
          </LiveExample>
          <p>
            The map draws tiles from any server with a <code>{"{z}/{x}/{y}"}</code>{" "}
            URL and needs no other package. It frames every record, follows the next
            page as long as the reader has not moved it, and is dragged with the
            mouse, a finger or the arrow keys. Nothing is geocoded: a resource with
            an address and no coordinates stores the ones its API computed, or
            resolves them in <code>getPosition</code>. OpenStreetMap&apos;s tiles,
            the default, are fine for a demo; a real application declares its own
            provider in <code>tileUrl</code> and <code>attribution</code>.
          </p>
        </Section>

        <Section
          title="layout.chart()"
          intro="A count, a total and an average in tiles, and one bar per value of groupBy — or one column per period of dateField."
        >
          <CodeBlock>{chart}</CodeBlock>
          <LiveExample label="layout.chart(), on orders">
            <ViewResourceContextProvider
              resource={ordersResource}
              resourceAction={ActionList.list}
              scope="docs"
            />
          </LiveExample>
          <p>
            The figures are those of the page the API returned, filters included —
            when it holds more, the chart says so under it. A dashboard over the
            whole collection asks the API for its own figures; this layout is for
            seeing at a glance what the list holds.
          </p>
        </Section>
      </>
    ),
  },
})

const tree = `layout.tree<Team>({
  parentField: "parent",   // "/api/teams/1", "1", or { "@id": "/api/teams/1" }
  titleField: "name",
  defaultExpanded: true,
})`

const map = `layout.map<Shop>({
  latitudeField: "latitude",
  longitudeField: "longitude",
  // or: getPosition: (shop) => shop.location && { lat: shop.location[1], lng: shop.location[0] },
  height: 360,
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
})`

const chart = `layouts: [
  layout.chart<Order>({
    groupBy: "status",
    groups: STATUSES,          // labels and order of the bars
    valueField: "total",       // summed; aggregate: "average" | "count"
    valueLabel: "revenue",
    format: (n) => euros.format(n),
  }),
  layout.chart<Order>({
    id: "monthly",
    dateField: "placedAt",     // one column per period instead
    interval: "month",         // "day" | "week" | "month"
  }),
]`

export default treeMapChartResource
