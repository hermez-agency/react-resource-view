import { createFileRoute } from "@tanstack/react-router"
import { ActionList } from "react-data-form"
import { generateLink, Link } from "react-resource-view"
import { Callout } from "@/components/Callout"
import { CodeBlock } from "@/components/CodeBlock"
import { DocArticle } from "@/components/DocArticle"
import { PropsTable } from "@/components/PropsTable"
import { A, C, H2, Li, P, Term, Ul } from "@/components/prose"

export const Route = createFileRoute("/docs/resource-view/sub-views")({
  head: () => ({
    meta: [
      { title: "Sub-views and tabs — react-resource-view" },
      {
        name: "description",
        content:
          "Nesting a resource inside another one's detail page: tabs derived from the parent, filtered by it, and a dialog for a child view.",
      },
    ],
  }),
  component: SubViews,
})

const SUB = `views: {
  read: {
    tabs: {
      items: [
        {
          // A nested resource, filtered by the record on screen.
          resource: articles,
          label: "Articles",
          icon: FileText,
          filter: ({ item }) => ({ author: item["@id"] }),
        },
        {
          // Or a tab of your own, with no resource behind it.
          id: "activity",
          label: "Activity",
          icon: Activity,
          component: AuthorActivity,
        },
      ],
    },
  },
}`

const DEFAULT_DATA = `{
  resource: articles,
  // Filters the list…
  filter: ({ item }) => ({ author: item["@id"] }),
  // …and pre-fills the create form opened from inside it.
  defaultData: ({ item }) => ({ author: item["@id"] }),
}`

const DIALOG = `import { ChildViewResourceDialog } from "react-resource-view"

// A second context, rendered over the first — creating a category without
// leaving the article being written.
<ChildViewResourceDialog
  childViewResource={{ resource: categories, resourceAction: ActionList.create }}
/>`

const ORIENTATION = `tabs: {
  // "horizontal" by default: a bar above the sub-view.
  orientation: "vertical",
  items: [...],
}`

const NESTED_URL = `/admin/authors/read/7/articles
//                            └ subResource: which tab is open

/admin/authors/read/7/articles/categories/create
//                            └ the child view's own three segments`

/**
 * The page this one describes, running in the playground.
 *
 * The link is built rather than written out so it reads like the call an
 * application would make — and because the open tab is a segment of the
 * context, it lands on the team of that company rather than on the company.
 */
function LiveExample() {
  const href = generateLink({
    scope: "admin",
    resourceId: "admin_companies",
    resourceAction: ActionList.update,
    id: "1",
    subResource: "team",
  })

  return (
    <Callout kind="tip" title="The example, live">
      <P>
        The playground's back office has a company page built exactly this way:
        the form first, then its team, filtered by the company on screen and
        creating records that already belong to it.{" "}
        <Link to={href}>Open a company with its tabs</Link>.
      </P>
    </Callout>
  )
}

function SubViews() {
  return (
    <DocArticle
      toc={[
        { id: "why", title: "The shape of the problem" },
        { id: "declaring", title: "Declaring tabs" },
        { id: "navigation", title: "Where the tabs are drawn" },
        { id: "context", title: "Deriving from the parent" },
        { id: "url", title: "Nesting in the URL" },
        { id: "dialog", title: "A child view in a dialog" },
      ]}
    >
      <H2 id="why">The shape of the problem</H2>

      <P>
        An author's page is not only the author. It is the author, their articles,
        their comments, their activity — each of which is a collection in its own
        right, and each of which should be filtered by the record on screen without
        that filter being the reader's to remove.
      </P>

      <P>
        A <Term id="sub-view">sub-view</Term> is a full <Term id="view">view</Term>{" "}
        context nested inside another: it fetches, it filters, it paginates, it
        writes. It is not a read-only panel.
      </P>

      <LiveExample />

      <H2 id="declaring">Declaring tabs</H2>

      <P>
        <C>tabs.items</C> is the tabs of a detail page — on <C>views.read</C>, or on{" "}
        <C>views.update</C> under the edit form. An entry takes one of two shapes — a nested <Term id="resource">resource</Term>, or a component
        of your own.
      </P>

      <CodeBlock>{SUB}</CodeBlock>

      <P>
        <C>resource</C> takes the resource itself, or its id. Prefer the resource:
        an id is checked in development when the declaration runs, and a resource
        declared after this one — a module imported later — is not known yet, so{" "}
        <C>createViewResource</C> throws. Importing the resource makes the order
        right by construction.
      </P>

      <PropsTable
        rows={[
          {
            name: "resource",
            type: "ViewResource | string",
            description:
              "The nested resource, or its identifier. Omit for a free-form tab.",
          },
          {
            name: "action",
            type: "Action",
            default: '"list"',
            description: "Which of its views the tab renders.",
          },
          {
            name: "id",
            type: "string",
            description: (
              <>
                The tab's identifier in the URL. Defaults to the resource's{" "}
                <C>@id</C>.
              </>
            ),
          },
          {
            name: "label",
            type: "string",
            description: "The tab label. Defaults to the resource's name.",
          },
          {
            name: "icon",
            type: "IconType",
            description: "The tab icon. Defaults to the resource's.",
          },
          {
            name: "component",
            type: "FC",
            description:
              "Custom rendering, in place of a resource — the free-form tab.",
          },
          {
            name: "filter",
            type: "FilterInterface | (({ item, parent }) => FilterInterface)",
            description:
              "Narrows the tab to the record on screen — static, or derived from it.",
          },
          {
            name: "defaultData",
            type: "object | (({ item, parent }) => object)",
            description: "What a record created from the tab starts with.",
          },
        ]}
      />

      <P>
        Beside <C>items</C>, <C>tabs.aside</C> takes a component drawn beside the
        tabs on a desktop and above them on a phone — a summary of the record, say.
      </P>

      <P>
        <C>MultiViewTab</C> renders the tab bar. It is exported, so a detail page
        laid out by hand can place it wherever it belongs.
      </P>

      <H2 id="navigation">Where the tabs are drawn</H2>

      <P>
        By default the tabs are a bar above the sub-view. It stays on a single line
        and scrolls sideways when they run past the screen, which is what a phone
        needs: eight sub-views used to wrap onto three rows of buttons and push the
        sub-view itself below the fold, and the labels were cut short to limit the
        damage.
      </P>

      <CodeBlock>{ORIENTATION}</CodeBlock>

      <P>
        <C>{'orientation: "vertical"'}</C> puts them in a column beside the sub-view
        instead — the shape a record with a dozen of them wants, since a menu read
        from top to bottom shows them all at once and the sub-view keeps the rest of
        the width. The column follows the reader down the page.
      </P>

      <Callout kind="note" title="The column is a desktop shape">
        <P>
          Below <C>768px</C> a menu beside the sub-view would leave it a third of the
          screen, so <C>vertical</C> falls back to the scrolling bar there. Nothing
          to declare for it: the same declaration reads both ways.
        </P>
      </Callout>

      <H2 id="context">Deriving from the parent</H2>

      <P>
        <C>filter</C> and <C>defaultData</C> may be functions of{" "}
        <C>{"{ item, parent }"}</C> — the record on screen and its view context —
        typed after the resource the tabs are declared on. They run when the
        sub-view mounts.
      </P>

      <CodeBlock>{DEFAULT_DATA}</CodeBlock>

      <Callout kind="tip" title="Filter and defaultData together">
        <P>
          Filtering alone gives a list of the author's articles whose create button
          makes an article belonging to nobody. Setting <C>defaultData</C> as well is
          what makes “new article” mean “new article <em>by this author</em>”.
        </P>
      </Callout>

      <P>
        Filters injected this way are marked as generated, so “clear search” keeps
        them —{" "}
        <A href="/docs/resource-view/filters">as the filters page describes</A>.
        Losing that one would show every author's articles inside a page about one of
        them.
      </P>

      <H2 id="url">Nesting in the URL</H2>

      <P>
        The open tab is a segment of the context, and a child view appends its own
        three segments after it. So a nested state is addressable, and the back
        button walks out of it a step at a time.
      </P>

      <CodeBlock lang="bash">{NESTED_URL}</CodeBlock>

      <Ul>
        <Li>
          Switching tabs does not reset the scroll position — the views ask the
          router not to.
        </Li>
        <Li>
          A sub-view's filter is not written to the URL: only the outermost context
          owns the query string, which is what keeps two nested lists from
          overwriting each other.
        </Li>
      </Ul>

      <H2 id="dialog">A child view in a dialog</H2>

      <P>
        Sometimes the nested thing should not replace the page. A category has to be
        created in the middle of writing an article, and the article must still be
        there afterwards.
      </P>

      <CodeBlock>{DIALOG}</CodeBlock>

      <P>
        <C>ChildViewResourceDialog</C> renders a second context over the first. The
        parent is untouched, and the resource's <C>onChange</C> is what tells the
        field behind the dialog to reload its options.
      </P>

      <Callout kind="note" title="views.<action>.open">
        <P>
          A view can also ask to open over the page rather than in place — with{" "}
          <C>{'open: "dialog"'}</C> for a dialog, or <C>{'open: "drawer"'}</C> for a
          panel sliding in from the right, from the bottom on a phone — together
          with <C>afterSave</C>, which decides what happens once the write lands.
        </P>
      </Callout>
    </DocArticle>
  )
}
