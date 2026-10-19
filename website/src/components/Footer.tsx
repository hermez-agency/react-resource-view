import { Link } from "@tanstack/react-router"
import { Github } from "lucide-react"
import { version as RESOURCE_VIEW_VERSION } from "react-resource-view/package.json"
import { Logo } from "@/components/Logo"
import { FORM_SECTION, VIEW_SECTION } from "@/lib/navigation"

const NPM = "https://www.npmjs.com/package/react-resource-view"

/** Live badges: they read npm and GitHub when the page loads, so they never go stale. */
const BADGES = [
  {
    label: "npm version",
    href: NPM,
    src: "https://img.shields.io/npm/v/react-resource-view?label=npm&color=informational",
  },
  {
    label: "npm downloads per month",
    href: NPM,
    src: "https://img.shields.io/npm/dm/react-resource-view?label=downloads",
  },
  {
    label: "MIT license",
    href: `${VIEW_SECTION.repository}/blob/main/LICENSE`,
    src: "https://img.shields.io/npm/l/react-resource-view?label=license",
  },
  {
    label: "GitHub stars",
    href: VIEW_SECTION.repository,
    src: "https://img.shields.io/github/stars/hermez-agency/react-resource-view?style=flat&label=stars",
  },
]

/**
 * The footer of every page.
 *
 * It also says which release of react-resource-view the site — the playground
 * included — runs on, read from the package it was built with. The npm badge
 * above gives the latest release: when the two differ, the site is behind.
 *
 * Rendered once from the root document rather than per route, so a page added
 * tomorrow carries it without remembering to.
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pt-8 lg:px-8">
        {BADGES.map((badge) => (
          <li key={badge.label}>
            <a href={badge.href} target="_blank" rel="noreferrer">
              <img
                src={badge.src}
                alt={badge.label}
                height={20}
                loading="lazy"
                className="h-5"
              />
            </a>
          </li>
        ))}
      </ul>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="flex items-center gap-2">
          <Logo className="size-5" />
          <span>
            MIT ·{" "}
            <a
              href="https://hermez.dev"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-foreground"
            >
              A Hermez product
            </a>
          </span>
        </p>

        <nav className="flex flex-wrap items-center gap-4">
          <a
            href={FORM_SECTION.repository}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition hover:text-foreground"
          >
            <Github className="size-3.5" />
            react-data-form
          </a>
          <a
            href={VIEW_SECTION.repository}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition hover:text-foreground"
          >
            <Github className="size-3.5" />
            react-resource-view
          </a>
          <Link
            to="/docs/resource-view/changelog/"
            hash={`v${RESOURCE_VIEW_VERSION}`}
            className="transition hover:text-foreground"
          >
            Running react-resource-view v{RESOURCE_VIEW_VERSION}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
