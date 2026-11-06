import type { ReactNode } from "react"
import { ArrowLeft, Building2, CalendarDays, Mail, Pencil, Trash2 } from "lucide-react"
import { ActionList } from "react-data-form"
import {
  generateLinkByResource,
  Link,
  permissionResource,
  ResourceViewButton,
  useCurrentViewResourceContext,
} from "react-resource-view"
import {
  Badge,
  formatDay,
  USER_LABELS,
  USER_TONES,
} from "@/demo/playground/adminRows"
import { USER_ROLES, type User } from "@/demo/playground/adminData"
import { cn } from "@/lib/cn"

/**
 * The top of an account's page: who it is, and what can be done to it.
 *
 * It is the view's `components.navigation`, so it stands in for the whole
 * header `AdminLayout` would draw — which is what keeps the name on screen
 * once: the default header titles the page with the record's name, and a card
 * under it would have said it a second time.
 *
 * The two buttons are `ResourceViewButton`s, so they go through the resource
 * like every other action of the back office: each renders nothing when the
 * resource does not permit it, "Edit user" opens the form where the update view
 * says — a drawer — and a save refetches this page, so the card is redrawn
 * with what was just written.
 */
export function UserHeader() {
  const currentResource = useCurrentViewResourceContext()
  const user = currentResource.data as User | undefined
  const resource = currentResource.resource

  const listLink = permissionResource(resource, ActionList.list)
    ? generateLinkByResource({ resource, resourceAction: ActionList.list })
    : undefined

  return (
    <header data-slot="admin-header" className="w-full">
      {listLink && (
        <Link
          to={listLink}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {resource.name}
        </Link>
      )}

      {user ? <UserCard user={user} /> : <UserCardSkeleton />}
    </header>
  )
}

function UserCard({ user }: { user: User }) {
  const status = user.status ?? "active"
  const role = USER_ROLES.find((option) => option.value === user.role)

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs sm:p-6 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Avatar name={user.name} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="min-w-0 text-xl font-semibold tracking-tight break-words sm:text-2xl">
              {user.name}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {role && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                  {role.label}
                </span>
              )}
              <Badge tone={USER_TONES[status] ?? "neutral"}>
                {USER_LABELS[status] ?? status}
              </Badge>
            </div>
          </div>

          <ul className="mt-3 flex flex-col gap-x-5 gap-y-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap">
            {user.email && (
              <Meta icon={<Mail />}>
                <a
                  href={`mailto:${user.email}`}
                  className="truncate underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {user.email}
                </a>
              </Meta>
            )}
            <Meta icon={<Building2 />}>
              {/* An account with no company is one of the roastery's own. */}
              <span className="truncate">{user.company || "Roastery staff"}</span>
            </Meta>
            {user.signedUpAt && (
              <Meta icon={<CalendarDays />}>
                <span>Joined on {formatDay(user.signedUpAt)}</span>
              </Meta>
            )}
          </ul>
        </div>
      </div>

      <div className="flex gap-2 md:shrink-0 [&>a]:flex-1 md:[&>a]:flex-none">
        <ResourceViewButton action={ActionList.update} data={user}>
          <span className={cn(ACTION, "bg-primary text-primary-foreground hover:bg-primary/90")}>
            <Pencil className="size-4" />
            Edit user
          </span>
        </ResourceViewButton>
        <ResourceViewButton action={ActionList.delete} data={user}>
          <span
            className={cn(
              ACTION,
              "border border-border bg-background text-muted-foreground hover:border-destructive/40 hover:text-destructive"
            )}
          >
            <Trash2 className="size-4" />
            Delete
          </span>
        </ResourceViewButton>
      </div>
    </div>
  )
}

/**
 * What a button looks like here. The link `ResourceViewButton` wraps it in is
 * what takes the focus, hence the ring drawn from it.
 */
const ACTION =
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors [a:focus-visible>&]:ring-2 [a:focus-visible>&]:ring-ring [a:focus-visible>&]:ring-offset-2 [a:focus-visible>&]:ring-offset-background"

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5 [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      {children}
    </li>
  )
}

const AVATAR_TONES = [
  "bg-view-soft text-view",
  "bg-form-soft text-form",
  "bg-primary/10 text-primary",
]

/**
 * The person's initials rather than a picture nobody uploaded — the first and
 * the last word of the name — on a tint that stays the same for the same name.
 */
function Avatar({ name }: { name: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const initials =
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : (words[0]?.slice(0, 2) ?? "?")
  const tone = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold sm:size-14 sm:text-lg",
        AVATAR_TONES[tone % AVATAR_TONES.length]
      )}
    >
      {initials}
    </span>
  )
}

/** The card's own shape while the account is fetched, so nothing jumps. */
function UserCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <span className="size-12 shrink-0 rounded-full bg-muted sm:size-14" />
      <div className="flex-1 space-y-3">
        <div className="h-6 w-48 max-w-full rounded bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted" />
      </div>
    </div>
  )
}

/**
 * The body of an account's page, which is empty: the page is the card above
 * and the tabs below, with the synthesis beside them. The form is one click
 * away, in a drawer, rather than the first thing the page shows.
 */
export function UserPage() {
  return null
}
