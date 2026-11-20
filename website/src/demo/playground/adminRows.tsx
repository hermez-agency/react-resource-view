import type { ReactNode } from "react"
import type { InputControllerInterface } from "react-data-form"
import { Field, type RowComponentPropsInterface } from "react-resource-view"
import type {
  Comment,
  Company,
  Newsletter,
  Order,
  OrderCustomer,
  Post,
  Product,
  Task,
  User,
} from "@/demo/playground/adminData"
import { TASK_TAGS } from "@/demo/playground/adminData"
import { cn } from "@/lib/cn"

/**
 * How one record is drawn in the layouts that show a whole item rather than a
 * row of cells — the card grids, and the list the comments are moderated in.
 *
 * Those layouts fall back to `DumpRowComponent`, which prints every key of the
 * raw item, `@id` and `@type` included. That is the right default for getting
 * something on screen and the wrong thing to put in a back office, so each
 * resource of the administration supplies one of these instead.
 */

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-view-soft text-view",
  warn: "bg-form-soft text-form",
  danger: "bg-destructive/10 text-destructive",
} as const

export type Tone = keyof typeof TONES

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONES[tone]
      )}
    >
      {children}
    </span>
  )
}

/** The same currency the form ports are configured with — see `configureLibraries`. */
const PRICE = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" })

export function formatPrice(cents: number): string {
  return PRICE.format((cents ?? 0) / 100)
}

/**
 * A day as a person says it — "3 November 2025" — from the ISO date the
 * fixtures store. Read in UTC, which is what a bare `YYYY-MM-DD` is parsed in,
 * so a reader west of Greenwich does not see the day before.
 */
const DAY = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" })

export function formatDay(isoDate: string): string {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? isoDate : DAY.format(date)
}

const COMPANY_TONES: Record<Company["status"], Tone> = {
  prospect: "warn",
  customer: "info",
  former: "neutral",
}

const COMPANY_LABELS: Record<Company["status"], string> = {
  prospect: "Prospect",
  customer: "Customer",
  former: "Former customer",
}

export function CompanyRow({ row }: RowComponentPropsInterface) {
  const company = row?.data as Company | undefined
  if (!company) return null

  const status = company.status ?? "prospect"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{company.name}</p>
        <Badge tone={COMPANY_TONES[status] ?? "neutral"}>
          {COMPANY_LABELS[status] ?? status}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">{company.city}</p>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono">
          {company.siret}
        </span>
        <span>since {company.signedAt}</span>
      </p>
    </div>
  )
}

export const USER_TONES: Record<User["status"], Tone> = {
  active: "info",
  invited: "warn",
  suspended: "danger",
}

export const USER_LABELS: Record<User["status"], string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
}

export function UserRow({ row }: RowComponentPropsInterface) {
  const user = row?.data as User | undefined
  if (!user) return null

  const status = user.status ?? "active"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{user.name}</p>
        <Badge tone={USER_TONES[status] ?? "neutral"}>
          {USER_LABELS[status] ?? status}
        </Badge>
      </div>

      <p className="truncate text-sm text-muted-foreground">{user.email}</p>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded border border-border px-1.5 py-0.5 capitalize">
          {user.role}
        </span>
        <span>joined {user.signedUpAt}</span>
      </p>
    </div>
  )
}

const POST_TONES: Record<Post["status"], Tone> = {
  draft: "neutral",
  scheduled: "warn",
  published: "info",
}

const POST_LABELS: Record<Post["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
}

export function PostRow({ row }: RowComponentPropsInterface) {
  const post = row?.data as Post | undefined
  if (!post) return null

  const status = post.status ?? "draft"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{post.title}</p>
        <Badge tone={POST_TONES[status] ?? "neutral"}>
          {POST_LABELS[status] ?? status}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">{post.author}</p>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded border border-border px-1.5 py-0.5">
          {post.category}
        </span>
        {post.publishedAt && <span>{post.publishedAt}</span>}
        <span aria-hidden>·</span>
        <span>{post.views} views</span>
      </p>
    </div>
  )
}

const NEWSLETTER_TONES: Record<Newsletter["status"], Tone> = {
  draft: "neutral",
  scheduled: "warn",
  sent: "info",
}

const NEWSLETTER_LABELS: Record<Newsletter["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sent: "Sent",
}

/** A newsletter as the inbox would list it: the subject, then the preheader. */
export function NewsletterRow({ row }: RowComponentPropsInterface) {
  const newsletter = row?.data as Newsletter | undefined
  if (!newsletter) return null

  const status = newsletter.status ?? "draft"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{newsletter.subject}</p>
        <Badge tone={NEWSLETTER_TONES[status] ?? "neutral"}>
          {NEWSLETTER_LABELS[status] ?? status}
        </Badge>
      </div>

      {newsletter.preheader && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {newsletter.preheader}
        </p>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{newsletter.fromName}</span>
        {newsletter.sendAt && (
          <>
            <span aria-hidden>·</span>
            <span>{newsletter.sendAt}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{newsletter.blocks?.length ?? 0} blocks</span>
      </p>
    </div>
  )
}

const COMMENT_TONES: Record<Comment["status"], Tone> = {
  pending: "warn",
  approved: "info",
  spam: "danger",
}

const COMMENT_LABELS: Record<Comment["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  spam: "Spam",
}

export function CommentRow({ row }: RowComponentPropsInterface) {
  const comment = row?.data as Comment | undefined
  if (!comment) return null

  const status = comment.status ?? "pending"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{comment.author}</p>
        <Badge tone={COMMENT_TONES[status] ?? "neutral"}>
          {COMMENT_LABELS[status] ?? status}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">{comment.message}</p>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded border border-border px-1.5 py-0.5">
          {comment.post}
        </span>
        <span>{comment.createdAt}</span>
      </p>
    </div>
  )
}

const PRODUCT_TONES: Record<Product["status"], Tone> = {
  draft: "neutral",
  active: "info",
  archived: "warn",
}

const PRODUCT_LABELS: Record<Product["status"], string> = {
  draft: "Draft",
  active: "On sale",
  archived: "Archived",
}

export function ProductRow({ row }: RowComponentPropsInterface) {
  const product = row?.data as Product | undefined
  if (!product) return null

  const status = product.status ?? "draft"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{product.name}</p>
        <Badge tone={PRODUCT_TONES[status] ?? "neutral"}>
          {PRODUCT_LABELS[status] ?? status}
        </Badge>
      </div>

      <p className="font-mono text-sm text-muted-foreground">{product.sku}</p>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded border border-border px-1.5 py-0.5">
          {product.category}
        </span>
        <span className="font-medium text-foreground">
          {formatPrice(product.price)}
        </span>
        <span aria-hidden>·</span>
        <span className={cn(product.stock === 0 && "text-destructive")}>
          {product.stock === 0 ? "out of stock" : `${product.stock} in stock`}
        </span>
      </p>
    </div>
  )
}

const ORDER_TONES: Record<Order["status"], Tone> = {
  pending: "warn",
  paid: "info",
  shipped: "neutral",
  refunded: "danger",
}

const ORDER_LABELS: Record<Order["status"], string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  refunded: "Refunded",
}

/**
 * An order as a card. Every line but the reference sits in a `<Field>`, so the
 * card follows the list's "Shown fields" menu like the table does — down to a
 * single line of the customer: `customer.email` can go and `customer.name`
 * stay. The reference is the card's title, and a title is never hidden.
 */
export function OrderRow({ row }: RowComponentPropsInterface) {
  const order = row?.data as Order | undefined
  if (!order) return null

  const status = order.status ?? "pending"

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-mono font-medium leading-snug">
          {order.reference}
        </p>
        <Field name="status">
          <Badge tone={ORDER_TONES[status] ?? "neutral"}>
            {ORDER_LABELS[status] ?? status}
          </Badge>
        </Field>
      </div>

      <Field name="customer">
        <CustomerLines customer={order.customer} />
      </Field>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <Field name="total">
          <span className="font-medium text-foreground">
            {formatPrice(order.total)}
          </span>
        </Field>
        <Field name="placedAt">
          <span>placed {formatDay(order.placedAt)}</span>
        </Field>
      </p>
    </div>
  )
}

/**
 * The customer in a cell of the orders table: the sub-form the edit dialog
 * shows would be three inputs stacked in every row. Each line sits in a
 * `<Field>`, so the cell follows "Shown fields" line by line — the table on
 * its own only ever hides a whole column.
 */
export function OrderCustomerCell({ formInput }: InputControllerInterface) {
  return <CustomerLines customer={formInput.value as OrderCustomer | undefined} />
}

/** The customer's lines, each shown as long as "Shown fields" keeps it. */
function CustomerLines({ customer }: { customer?: Partial<OrderCustomer> }) {
  return (
    <div className="flex min-w-0 flex-col text-sm">
      <Field name="customer.name">
        <span className="truncate">{customer?.name}</span>
      </Field>
      <Field name="customer.email">
        <span className="truncate text-muted-foreground">{customer?.email}</span>
      </Field>
      <Field name="customer.city">
        <span className="truncate text-muted-foreground">{customer?.city}</span>
      </Field>
    </div>
  )
}

const PRIORITY_TONES: Record<Task["priority"], Tone> = {
  low: "neutral",
  medium: "info",
  high: "warn",
  urgent: "danger",
}

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

const TAG_LABELS = Object.fromEntries(TASK_TAGS.map((tag) => [tag.value, tag.label]))

/** "Ada Lovelace" as "AL": who a card is on, at the size of a badge. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
}

export function TaskRow({ row }: RowComponentPropsInterface) {
  const task = row?.data as Task | undefined
  if (!task) return null

  const priority = task.priority ?? "medium"
  // A task still open past its due date is the one thing a board has to say
  // out loud.
  const overdue =
    task.status !== "done" &&
    !!task.dueDate &&
    task.dueDate < new Date().toISOString().slice(0, 10)

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium leading-snug">{task.title}</p>
        <Badge tone={PRIORITY_TONES[priority] ?? "neutral"}>
          {PRIORITY_LABELS[priority] ?? priority}
        </Badge>
      </div>

      {task.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {task.description}
        </p>
      )}

      {task.tags?.length > 0 && (
        <p className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </p>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {task.assignee && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground"
            >
              {initials(task.assignee)}
            </span>
            {task.assignee}
          </span>
        )}
        {task.dueDate && (
          <>
            <span aria-hidden>·</span>
            <span className={cn(overdue && "font-medium text-destructive")}>
              due {task.dueDate}
            </span>
          </>
        )}
      </p>
    </div>
  )
}
