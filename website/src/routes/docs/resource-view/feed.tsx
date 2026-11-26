import { createFileRoute } from "@tanstack/react-router"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { Demo } from "@/components/Demo"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { ResourceDemo } from "@/components/ResourceDemo"
import { A, C, H2, Li, P, Ul } from "@/components/prose"
import { feedResource } from "@/demo/resources"

export const Route = createFileRoute("/docs/resource-view/feed")({
  head: () => ({
    meta: [
      { title: "Feed — react-resource-view" },
      {
        name: "description",
        content:
          "A journal or activity feed: the records as dated events, read from top to bottom, gathered by day, with relative times and a marker per type.",
      },
    ],
  }),
  component: Feed,
})

const DECLARATION = `import { layout } from "react-resource-view"
import { MessageSquare, Rocket } from "lucide-react"

layouts: [
  layout.feed<Event>({
    dateField: "createdAt",      // where an event sits on the thread
    titleField: "summary",       // the sentence
    descriptionField: "detail",  // the line under it
    actorField: "actor",         // who did it: a name, or { name }
    avatarField: "avatar",       // their picture; initials without one
    typeField: "kind",           // which marker an event gets…
    types: {                     // …an icon and a colour per value
      deploy: { icon: Rocket, color: "var(--color-view)" },
      comment: { icon: MessageSquare },
    },
    order: "desc",               // the most recent first, the default
  }),
]`

const LOCALE = `import { fr } from "date-fns/locale"
import { configurePorts } from "react-resource-view"

// "Hier", "il y a 5 minutes", « mardi 3 mars 2026 »
configurePorts({ dateLocale: fr })`

function Feed() {
  return (
    <DocArticle
      toc={[
        { id: "feed", title: "A journal" },
        { id: "options", title: "Options" },
        { id: "reading", title: "How it reads" },
        { id: "accessibility", title: "Keyboard and screen readers" },
        { id: "not-timeline", title: "Not the timeline" },
      ]}
    >
      <P>
        A feed is a journal: a sequence of dated events, read from top to bottom,
        the most recent first. It suits what an application records rather than what
        a person plans — an activity log, an audit trail, a deployment history, the
        comments under a ticket.
      </P>

      <H2 id="feed">A journal</H2>

      <CodeBlock>{DECLARATION}</CodeBlock>

      <Demo label="A team's last days" wide>
        <ResourceDemo resource={feedResource} variant="feed" />
      </Demo>

      <P>
        Events are gathered by day under a heading — <em>Today</em>,{" "}
        <em>Yesterday</em>, then the date written out — along a vertical thread with
        a marker each. A click on an event opens the record&apos;s{" "}
        <C>read</C> view, where that view says (<C>update</C> when{" "}
        <C>read</C> is not permitted). Filters, search, saved views and pagination
        work as on{" "}
        <A href="/docs/resource-view/layouts">any other layout</A>.
      </P>

      <H2 id="options">Options</H2>

      <PropsTable
        rows={[
          {
            name: "dateField",
            type: "string",
            default: `"createdAt"`,
            description:
              "The field the event is dated by: an ISO string, a timestamp or a Date. A record without a readable date closes the feed, under No date.",
          },
          {
            name: "titleField",
            type: "string",
            default: "the view's titleField",
            description: "The title of an event, or its sentence.",
          },
          {
            name: "descriptionField",
            type: "string",
            description: "A secondary text under the title.",
          },
          {
            name: "actorField",
            type: "string",
            description:
              "Who did it: a string, or an object holding a name, title or label.",
          },
          {
            name: "avatarField",
            type: "string",
            description:
              "The actor's picture — an URL or a media object. Their initials stand in when there is none.",
          },
          {
            name: "typeField",
            type: "string",
            description: "The field whose value picks the marker, with types.",
          },
          {
            name: "types",
            type: "Record<string, { icon?, color? }>",
            description:
              "An icon and a CSS colour per value of typeField. A dot, without one.",
          },
          {
            name: "order",
            type: `"desc" | "asc"`,
            default: `"desc"`,
            description: "The most recent first, or the oldest.",
          },
        ]}
      />

      <H2 id="reading">How it reads</H2>

      <Ul>
        <Li>
          The time is relative — “5 minutes ago” — and the full date is its tooltip
          and what a screen reader says. Both follow the <C>dateLocale</C> port.
        </Li>
        <Li>
          Every label — Today, Yesterday, No date — goes through{" "}
          <A href="/docs/resource-view/concepts">the library&apos;s i18n</A>.
        </Li>
        <Li>
          Pagination is the list&apos;s own: the feed shows the page on screen, and
          the days of the next page join it as it loads.
        </Li>
      </Ul>

      <CodeBlock>{LOCALE}</CodeBlock>

      <H2 id="accessibility">Keyboard and screen readers</H2>

      <P>
        The days are a list, and the events of each day a list inside it, so a
        screen reader announces how many there are. Each day is headed by an{" "}
        <C>h3</C>; each date is a <C>&lt;time&gt;</C> with its machine-readable
        value; the title of an event is a real link, reached with Tab and opened
        with Enter, and a click anywhere on the event follows it.
      </P>

      <H2 id="not-timeline">Not the timeline</H2>

      <Callout kind="note" title="Two different things over time">
        <P>
          <C>layout.timeline()</C> draws bars over periods, Gantt-style, to plan
          work. <C>layout.feed()</C> lists events that have happened, one after the
          other. The first answers “is room B free on Tuesday”, the second “what
          happened this week”.
        </P>
      </Callout>
    </DocArticle>
  )
}
