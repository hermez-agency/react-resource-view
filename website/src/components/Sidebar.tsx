import { Link, useRouterState } from "@tanstack/react-router"
import { SECTIONS, stripTrailingSlash, type DocSection } from "@/lib/navigation"
import { cn } from "@/lib/cn"

/**
 * The documentation navigation, split in two.
 *
 * The site documents two packages that are published, versioned and installed
 * separately, so the sidebar never mixes them: one block per library, each with
 * its own colour, its own npm name and its own repository link. A reader always
 * knows which package the page they are on belongs to — which is the one thing
 * a combined documentation site usually loses.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Without the normalisation the server and the browser disagree on every
  // statically hosted page — see `stripTrailingSlash`.
  const pathname = useRouterState({
    select: (state) => stripTrailingSlash(state.location.pathname),
  })

  return (
    <nav aria-label="Documentation" className="space-y-8 pb-16">
      {SECTIONS.map((section) => (
        <SidebarSection
          key={section.id}
          section={section}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

function SidebarSection({
  section,
  pathname,
  onNavigate,
}: {
  section: DocSection
  pathname: string
  onNavigate?: () => void
}) {
  const active = pathname.startsWith(`/docs/${section.id}`)
  const accent = section.accent === "form" ? "bg-form" : "bg-view"
  const accentSoft = section.accent === "form" ? "bg-form-soft" : "bg-view-soft"
  const accentText = section.accent === "form" ? "text-form" : "text-view"

  return (
    <section>
      <header
        className={cn(
          "mb-3 rounded-lg px-3 py-2.5 transition-colors",
          active ? accentSoft : "bg-transparent"
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className={cn("size-2 rounded-full", accent)} />
          {section.label}
        </p>
        <p className={cn("mt-0.5 pl-4 font-mono text-[11px]", accentText)}>
          {section.pkg}
        </p>
      </header>

      <div className="space-y-5">
        {section.groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-medium text-muted-foreground">
              {group.label}
            </p>

            <ul className="border-l border-border">
              {group.pages.map((page) => {
                const current = pathname === stripTrailingSlash(page.href)
                const Icon = page.icon

                return (
                  <li key={page.href} className="relative">
                    {current && (
                      <span
                        className={cn(
                          "absolute -left-px top-1 h-[calc(100%-0.5rem)] w-0.5 rounded-full",
                          accent
                        )}
                      />
                    )}
                    <Link
                      to={page.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 py-1.5 pl-3 pr-2 text-sm transition-colors",
                        current
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          current ? accentText : "opacity-60"
                        )}
                      />
                      <span className="truncate">{page.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
