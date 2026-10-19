import type { ReactNode } from "react"
import { generateLink, isActiveItemMenu } from "react-resource-view"
import { getMenu, overviewResource } from "./pages"
import { cn } from "@/ui/cn"

/**
 * The shell every documentation page renders inside.
 *
 * It reads the menu off the current scope and builds its links with
 * `generateLink`, so the sidebar goes through the same routing as the views —
 * which is what keeps every page addressable in query mode.
 */
export function DocLayout({ children }: { children: ReactNode }) {
  const menu = getMenu()

  return (
    <div className="mx-auto flex min-h-full max-w-6xl gap-8 px-4 lg:px-8">
      <nav className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-56 lg:shrink-0 lg:py-14">
        <a
          href={generateLink({ resource: overviewResource, scope: "docs" })}
          className="font-semibold tracking-tight"
        >
          react-resource-view
        </a>
        <p className="mt-1 text-xs text-muted-foreground">
          Documented with itself
        </p>

        <ul className="mt-6 space-y-1 text-sm">
          {menu.map((item) => {
            const href = item.href ?? "#"
            const active = isActiveItemMenu(item)
            const Icon = item.icon

            return (
              <li key={item.name}>
                <a
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0" />}
                  {item.name}
                </a>
              </li>
            )
          })}
        </ul>

        <a
          className="mt-8 block px-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          href="https://github.com/hermez-agency/react-resource-view"
        >
          GitHub
        </a>
      </nav>

      <main className="min-w-0 flex-1 py-8 lg:py-14">
        <MobileMenu />
        {children}
        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          A Hermez product
        </footer>
      </main>
    </div>
  )
}

function MobileMenu() {
  const menu = getMenu()

  return (
    <nav className="mb-8 flex flex-wrap gap-2 text-sm lg:hidden">
      {menu.map((item) => (
        <a
          key={item.name}
          href={item.href ?? "#"}
          className="rounded-md border border-border px-3 py-1.5"
        >
          {item.name}
        </a>
      ))}
    </nav>
  )
}

/** A titled block of prose, the unit every documentation page is built from. */
export function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-muted-foreground">{intro}</p>}
      <div className="prose-docs mt-4 max-w-2xl">{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  intro,
}: {
  title: string
  intro: ReactNode
}) {
  return (
    <header className="mb-10">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{intro}</p>
    </header>
  )
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="not-prose my-4 overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

/** Frames a live example, so it reads as something running rather than quoted. */
export function LiveExample({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-border bg-card">
      <p className="border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="p-4">{children}</div>
    </div>
  )
}
