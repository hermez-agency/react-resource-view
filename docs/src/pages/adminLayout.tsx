import { createViewResource, generateLink } from "react-resource-view"
import { LayoutPanelLeft } from "lucide-react"
import { CodeBlock, PageHeader, Section } from "../DocLayout"
import adminLayoutDemoResource from "./adminLayoutDemo"

const blocks: [string, string][] = [
  ["AdminSidebarNav", "The desktop sidebar, built from the scope's menu"],
  [
    "AdminTopBar",
    "Sticky top bar: the sidebar toggle, the breadcrumb, and a slot for the rest",
  ],
  [
    "AdminHeader",
    "Page header: back to the list, the record's name, its actions, and the sub-navigation tabs a menu group opts into",
  ],
  [
    "AdminMobileNav",
    "Bottom navigation bar, in place of the sidebar on narrow screens",
  ],
]

const adminLayoutResource = createViewResource("admin-layout", {
  name: "Admin layout",
  icon: LayoutPanelLeft,
  components: {
    view: () => (
      <>
        <PageHeader
          title="Admin layout"
          intro="A scope's decoratorComponent wraps every view of that scope — the navigation and the page heading around them. AdminLayout is a ready-made one, so a project reaches for it instead of writing the same sidebar and top bar again."
        />

        <p className="mb-10 -mt-6 text-sm text-muted-foreground">
          <a
            href={generateLink({ resource: adminLayoutDemoResource, scope: "docs" })}
            className="underline underline-offset-4 hover:text-foreground"
          >
            See it running
          </a>{" "}
          on two resources, rather than reading about it.
        </p>

        <Section
          title="Point it at a scope"
          intro="Nothing beyond a menu is required — the sidebar, the top bar and the mobile navigation all read it."
        >
          <CodeBlock>{usage}</CodeBlock>
          <p>
            The menu drives everything: an entry with <code>items</code> becomes a
            collapsible group, and one with <code>subNavigation: true</code> opens on
            its first page while the header shows the sibling pages as tabs instead
            of nesting them in the sidebar.
          </p>
        </Section>

        <Section
          title="A logo, or something at the end of the top bar"
          intro="decoratorComponent only ever receives children, so AdminLayout itself takes no props there — createAdminLayout bakes them in instead."
        >
          <CodeBlock>{withOptions}</CodeBlock>
        </Section>

        <Section
          title="The bottom of the sidebar"
          intro="Help, support, documentation: footerMenu pins links at the bottom of the sidebar, drawn like the menu, under an optional footerMenuTitle; sidebarFooter takes any node instead."
        >
          <CodeBlock>{sidebarFooter}</CodeBlock>
          <p>
            An absolute <code>href</code> opens in a new tab. Without either option
            the sidebar has no footer; on a phone, both go behind a last entry of the
            bottom bar, which opens them in a drawer. That drawer also takes the menu
            entries past <code>mobileNavMaxItems</code> (4 by default), ahead of the
            footer links.
          </p>
        </Section>

        <Section
          title="The page header"
          intro="On a record, the header says which one is on screen and how to get back: a link to the list, the record's name as the title, the action and its id underneath, and the actions still worth offering — edit from the read page, delete from either."
        >
          <p>
            The name is read from <code>title</code>, <code>name</code> or{" "}
            <code>label</code>; a view names another field with <code>titleKey</code>
            . The same name ends the breadcrumb in the top bar, after the scope's{" "}
            <code>label</code> and the resource.
          </p>
          <CodeBlock>{headerOverrides}</CodeBlock>
        </Section>

        <Section
          title="Full width, view by view"
          intro="Views are drawn in a column of constrained width — the right measure for a form, too narrow for a board, a calendar or a wide table. A view declaring fullWidth takes the whole page instead, keeping the side margins."
        >
          <CodeBlock>{fullWidth}</CodeBlock>
          <p>
            The most specific declaration wins: the list variant on screen, then the
            action&apos;s entry in <code>views</code>, then the resource&apos;s{" "}
            <code>view</code>. Nothing declared means the column, so a resource that
            never mentions it is drawn as before. A <code>decoratorComponent</code>{" "}
            of your own reads the same option with <code>isFullWidthView</code>. The{" "}
            <a href="https://hermez.dev/react-resource-view/playground?view=admin/admin_tasks/list">
              playground&apos;s task board
            </a>{" "}
            runs on it.
          </p>
        </Section>

        <Section
          title="Responsive by default"
          intro="Below the md breakpoint the sidebar is replaced with a bottom navigation bar; a menu entry with children opens a drawer instead of a nested menu."
        >
          <p>
            Nothing to configure: <code>AdminLayout</code> switches on the viewport
            width itself.
          </p>
        </Section>

        <Section
          title="Composing it differently"
          intro="Each piece is exported on its own, for a project whose shell doesn't match AdminLayout's shape."
        >
          <div className="not-prose overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Component</th>
                  <th className="py-2 font-medium">Renders</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map(([name, description]) => (
                  <tr key={name} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-xs">{name}</td>
                    <td className="py-2 text-muted-foreground">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A <code>decoratorComponent</code> can also be written from scratch, the
            way{" "}
            <a href="https://github.com/hermez-agency/react-resource-view/blob/main/docs/src/DocLayout.tsx">
              this site's own shell
            </a>{" "}
            is — <code>AdminLayout</code> is one reasonable default, not the only
            one.
          </p>
        </Section>
      </>
    ),
  },
})

const usage = `const adminScope: ScopeInterface = {
  name: "admin",
  decoratorComponent: AdminLayout,
  resources: [articlesResource, usersResource],
  // One entry per resource — or a list mixing resources, links and groups.
  menu: "auto",
  defaultViewResourceContextParams: { resourceId: articlesResource["@id"] },
}`

const withOptions = `import { createAdminLayout } from "react-resource-view"

const adminScope: ScopeInterface = {
  name: "admin",
  decoratorComponent: createAdminLayout({
    logo: <MyLogo />,
    topBarEnd: <UserMenu />,
  }),
  menu: [/* … */],
}`

const sidebarFooter = `decoratorComponent: createAdminLayout({
  footerMenuTitle: "Need help?",
  footerMenu: [
    { name: "Documentation", icon: BookOpen, href: "https://example.com/docs" },
    { name: "Contact", icon: Mail, href: "mailto:support@example.com" },
  ],
  // Or anything at all, under the links.
  sidebarFooter: <PlanBadge />,
}),`

const headerOverrides = `views: {
  update: {
    // The field that names an account, instead of \`name\`.
    titleField: "email",
    components: {
      // Either of them, or both — the rest of the header stays.
      title: () => <h2>…</h2>,
      actions: () => <PublishButton />,
    },
  },
}`

const fullWidth = `createViewResource<Task>("tasks", {
  path: "/api/tasks",
  // Every action of the resource, across the whole page…
  fullWidth: true,
  views: {
    list: {
      layouts: [
        layout.board({ groupBy: "status", columns: STATUSES }),
        // …or a single layout of the list, with fullWidth on the layout.
        layout.table({ fullWidth: false }),
      ],
    },
    // The forms keep the column.
    update: { fullWidth: false },
  },
})`

export default adminLayoutResource
