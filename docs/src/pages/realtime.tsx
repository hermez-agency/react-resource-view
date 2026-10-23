import { createViewResource } from "react-resource-view"
import { Radio } from "lucide-react"
import { CodeBlock, PageHeader, Section } from "../DocLayout"

const realtimeResource = createViewResource("realtime", {
  name: "Realtime",
  icon: Radio,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Realtime"
          intro="A list that reads itself again when the API says something changed. The channel is yours to plug: Mercure out of the box, anything else with one function."
        />

        <Section
          title="Mercure, the default"
          intro="With the JSON-LD dialect, realtime: true listens to the resource's Mercure topic."
        >
          <CodeBlock>{mercure}</CodeBlock>
          <p>
            If the hub answers with an HTTP error — a <code>401</code> once the
            cookie has expired, a <code>502</code> during a deployment — the browser
            closes the connection for good. The package opens it again after 1 s, 2
            s, 4 s… up to 30 s, and reads the views again as soon as the hub is back:
            whatever was pushed meanwhile is not lost.
          </p>
          <p>
            A private hub on another domain needs the cookies:{" "}
            <code>withCredentials</code>.
          </p>
        </Section>

        <Section
          title="Your own channel"
          intro="subscribe receives refresh and returns what closes the channel."
        >
          <CodeBlock>{subscribe}</CodeBlock>
          <p>
            The subscription is taken when the views mount and released when they
            unmount. Calling <code>refresh</code> reads the views again; do it on
            each message, and again when your channel reconnects. Keep{" "}
            <code>subscribe</code> the same function from one render to the next — a
            new one each time subscribes again each time.
          </p>
        </Section>

        <Section
          title="Supabase Realtime"
          intro="Supabase publishes row changes over WebSockets; the dialect only reads and writes."
        >
          <CodeBlock>{supabase}</CodeBlock>
        </Section>

        <Section
          title="In a dialect"
          intro="A dialect can carry the channel for every resource that says realtime: true."
        >
          <CodeBlock>{dialect}</CodeBlock>
          <p>
            The resource's own <code>subscribe</code> comes first, then the dialect's{" "}
            <code>realtimeSubscribe</code>, then its Mercure topic.
          </p>
        </Section>
      </>
    ),
  },
})

const mercure = `createViewResource("tasks", {
  path: "/api/tasks",
  realtime: true,
})

// A private hub on another domain
createViewResource("tasks", {
  path: "/api/tasks",
  realtime: { withCredentials: true },
})`

const subscribe = `createViewResource("tickets", {
  path: "/api/tickets",
  realtime: {
    subscribe: (refresh) => {
      const source = new EventSource("/api/tickets/stream")
      source.onmessage = refresh
      source.onopen = refresh // read again once the connection is back
      return () => source.close()
    },
  },
})`

const supabase = `import { createClient } from "@supabase/supabase-js"

const supabase = createClient(URL, ANON_KEY)

createViewResource("tasks", {
  path: "/rest/v1/tasks",
  realtime: {
    subscribe: (refresh) => {
      const channel = supabase
        .channel("tasks")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refresh)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") refresh()
        })
      return () => {
        supabase.removeChannel(channel)
      }
    },
  },
})`

const dialect = `const myDialect = {
  ...restDialect({ /* … */ }),
  realtimeSubscribe: (path) => (refresh) => {
    const socket = new WebSocket(\`wss://example.com/ws?path=\${path}\`)
    socket.onmessage = refresh
    return () => socket.close()
  },
}`

export default realtimeResource
