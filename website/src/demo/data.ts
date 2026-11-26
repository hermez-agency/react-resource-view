import { setInStorage } from "ssr-safe-storage"

/**
 * The fixtures every demo on this site reads.
 *
 * Declaring a resource without a `path` makes `createViewResource` fall back to
 * the localStorage repository, so the whole documentation runs against a real
 * repository with no server behind it: creating, editing and deleting a row all
 * work, and the changes survive a reload.
 */

export interface Article {
  "@id": string
  "@type": string
  id: string
  title: string
  author: string
  category: string
  status: "draft" | "review" | "published"
  readingTime: number
  publishedAt: string
  /**
   * When the article was being written — only the home page's gallery copy
   * carries it, for the calendar and the timeline to place the article on.
   */
  writingStartAt?: string
  writingEndAt?: string
  /** The colour of its category, which the gallery's calendar paints it in. */
  categoryColor?: string
}

export interface Session {
  "@id": string
  "@type": string
  id: string
  title: string
  speaker: string
  room: string
  track: string
  status: "confirmed" | "hold"
  startAt: string
  endAt: string
}

export const ARTICLES_ID = "docs_articles"
export const SESSIONS_ID = "docs_sessions"
export const FEED_ID = "docs_feed"

export interface FeedEvent {
  "@id": string
  "@type": string
  id: string
  summary: string
  detail?: string
  actor: string
  kind: "deploy" | "review" | "incident" | "comment"
  createdAt: string
}

/**
 * The landing page's own copy of the articles.
 *
 * The builder there rebuilds its resource every time the reader changes the
 * description, and a resource is registered under its IRI — so it needs an IRI
 * of its own, or it would replace the one every documentation demo reads.
 */
export const HOME_ARTICLES_ID = "home_articles"

/**
 * The articles the "your own variant" page runs a scaffolded layout over.
 *
 * Same reason as above: that page declares a resource of its own so the extra
 * layout shows up there and nowhere else.
 */
export const VARIANT_ARTICLES_ID = "variant_articles"

/**
 * The articles the drawer and the asymmetric forms are demonstrated on.
 *
 * Same reason again: those two pages open their forms in a panel and ask for
 * fewer fields when creating than when editing, and neither is what the other
 * demos should show.
 */
export const DRAWER_ARTICLES_ID = "drawer_articles"

/**
 * The articles the home page lays out in all seven layouts.
 *
 * Its copy carries a writing window and a publication date relative to the
 * current week — a calendar and a timeline both open on today — which the
 * documentation pages, reading the fixed dates, should not change for.
 */
export const GALLERY_ARTICLES_ID = "gallery_articles"

const ARTICLES: Article[] = [
  {
    "@id": `/${ARTICLES_ID}/1`,
    "@type": ARTICLES_ID,
    id: "1",
    title: "Describing a form as data",
    author: "Ada Lovelace",
    category: "Forms",
    status: "published",
    readingTime: 7,
    publishedAt: "2026-01-12",
  },
  {
    "@id": `/${ARTICLES_ID}/2`,
    "@type": ARTICLES_ID,
    id: "2",
    title: "One registry, or none at all",
    author: "Grace Hopper",
    category: "Architecture",
    status: "published",
    readingTime: 5,
    publishedAt: "2026-01-28",
  },
  {
    "@id": `/${ARTICLES_ID}/3`,
    "@type": ARTICLES_ID,
    id: "3",
    title: "Why a deep path 404s on static hosting",
    author: "Alan Turing",
    category: "Routing",
    status: "review",
    readingTime: 4,
    publishedAt: "2026-02-04",
  },
  {
    "@id": `/${ARTICLES_ID}/4`,
    "@type": ARTICLES_ID,
    id: "4",
    title: "Reading an IRI without thinking about it",
    author: "Ada Lovelace",
    category: "JSON-LD",
    status: "draft",
    readingTime: 9,
    publishedAt: "2026-02-19",
  },
  {
    "@id": `/${ARTICLES_ID}/5`,
    "@type": ARTICLES_ID,
    id: "5",
    title: "Seven layouts over one collection",
    author: "Barbara Liskov",
    category: "Views",
    status: "review",
    readingTime: 11,
    publishedAt: "2026-03-02",
  },
  {
    "@id": `/${ARTICLES_ID}/6`,
    "@type": ARTICLES_ID,
    id: "6",
    title: "A controller is two props and a component",
    author: "Barbara Liskov",
    category: "Forms",
    status: "draft",
    readingTime: 6,
    publishedAt: "2026-03-15",
  },
  {
    "@id": `/${ARTICLES_ID}/7`,
    "@type": ARTICLES_ID,
    id: "7",
    title: "Filters that survive the first request",
    author: "Grace Hopper",
    category: "Views",
    status: "published",
    readingTime: 8,
    publishedAt: "2026-03-27",
  },
]

/** Anchors the schedule to the Monday of the current week. */
function mondayOfThisWeek(): Date {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekday = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - weekday)
  return monday
}

function at(dayOffset: number, hour: number, minutes = 0): string {
  const date = mondayOfThisWeek()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minutes, 0, 0)
  return date.toISOString()
}

const SESSION_SEEDS: Array<
  Omit<Session, "@id" | "@type" | "startAt" | "endAt"> & {
    day: number
    from: number
    to: number
  }
> = [
  {
    id: "1",
    title: "Forms as data",
    speaker: "Ada Lovelace",
    room: "Amphitheatre",
    track: "React",
    status: "confirmed",
    day: 0,
    from: 9,
    to: 10,
  },
  {
    id: "2",
    title: "JSON-LD in practice",
    speaker: "Grace Hopper",
    room: "Room B",
    track: "API",
    status: "confirmed",
    day: 0,
    from: 11,
    to: 12,
  },
  {
    id: "3",
    title: "Designing a CRUD you never write twice",
    speaker: "Barbara Liskov",
    room: "Amphitheatre",
    track: "React",
    status: "confirmed",
    day: 1,
    from: 10,
    to: 12,
  },
  {
    id: "4",
    title: "Routing without a router",
    speaker: "Alan Turing",
    room: "Room B",
    track: "Architecture",
    status: "hold",
    day: 1,
    from: 14,
    to: 15,
  },
  {
    id: "5",
    title: "Validation, twice over",
    speaker: "Ada Lovelace",
    room: "Workshop",
    track: "API",
    status: "confirmed",
    day: 2,
    from: 9,
    to: 11,
  },
  {
    id: "6",
    title: "Ports, adapters and one singleton",
    speaker: "Grace Hopper",
    room: "Amphitheatre",
    track: "Architecture",
    status: "confirmed",
    day: 3,
    from: 15,
    to: 16,
  },
  {
    id: "7",
    title: "Live coding: a controller in ten lines",
    speaker: "Barbara Liskov",
    room: "Workshop",
    track: "React",
    status: "hold",
    day: 4,
    from: 13,
    to: 14,
  },
]

/**
 * What the team did over the last days, counted back from the moment the demo
 * is seeded: a feed with no "Today" in it would read as abandoned.
 */
const FEED_SEEDS: Array<
  Pick<FeedEvent, "summary" | "detail" | "actor" | "kind"> & {
    daysAgo: number
    hour: number
    minute: number
  }
> = [
  {
    summary: "Released 2.3.0",
    detail: "Adds the feed layout",
    actor: "Ada Lovelace",
    kind: "deploy",
    daysAgo: 0,
    hour: 10,
    minute: 5,
  },
  {
    summary: "Approved the pull request « Group by day »",
    actor: "Grace Hopper",
    kind: "review",
    daysAgo: 0,
    hour: 9,
    minute: 20,
  },
  {
    summary: "Commented on « Keyboard navigation »",
    detail: "Tab should reach the link of each event",
    actor: "Barbara Liskov",
    kind: "comment",
    daysAgo: 1,
    hour: 16,
    minute: 40,
  },
  {
    summary: "Staging was down for 12 minutes",
    detail: "A migration held the database lock",
    actor: "System",
    kind: "incident",
    daysAgo: 1,
    hour: 11,
    minute: 2,
  },
  {
    summary: "Released 2.2.1",
    actor: "Ada Lovelace",
    kind: "deploy",
    daysAgo: 3,
    hour: 14,
    minute: 30,
  },
  {
    summary: "Requested changes on « Relative time »",
    detail: "The full date belongs in the tooltip",
    actor: "Grace Hopper",
    kind: "review",
    daysAgo: 4,
    hour: 15,
    minute: 10,
  },
  {
    summary: "Commented on « Dark mode contrast »",
    actor: "Barbara Liskov",
    kind: "comment",
    daysAgo: 6,
    hour: 9,
    minute: 45,
  },
]

function buildFeed(): FeedEvent[] {
  return FEED_SEEDS.map(({ daysAgo, hour, minute, ...event }, index) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(hour, minute, 0, 0)
    return {
      ...event,
      id: String(index + 1),
      "@id": `/${FEED_ID}/${index + 1}`,
      "@type": FEED_ID,
      createdAt: date.toISOString(),
    }
  })
}

function buildSessions(): Session[] {
  return SESSION_SEEDS.map(({ day, from, to, ...session }) => ({
    ...session,
    "@id": `/${SESSIONS_ID}/${session.id}`,
    "@type": SESSIONS_ID,
    startAt: at(day, from),
    endAt: at(day, to),
  }))
}

/**
 * An editorial calendar: when each article is written, and when it goes out.
 *
 * Every window starts between Monday and Friday of the current week, so the
 * calendar shows them all on opening whichever day the week starts on, and the
 * timeline's two weeks hold every one of them. Writing always ends before the
 * article is published, and an author never writes two articles at once.
 */
const WRITING_SEEDS: Record<
  string,
  { start: [number, number]; end: [number, number]; publishDay: number }
> = {
  "1": { start: [0, 9], end: [2, 17], publishDay: 3 },
  "2": { start: [0, 14], end: [1, 18], publishDay: 2 },
  "3": { start: [1, 9], end: [4, 17], publishDay: 7 },
  "4": { start: [3, 9], end: [8, 17], publishDay: 10 },
  "5": { start: [2, 10], end: [3, 18], publishDay: 7 },
  "6": { start: [4, 9], end: [10, 17], publishDay: 11 },
  "7": { start: [2, 9], end: [3, 12], publishDay: 4 },
}

/** Hex rather than a theme variable: the calendar tints a cell by appending an alpha. */
const CATEGORY_COLORS: Record<string, string> = {
  Forms: "#f59e0b",
  Views: "#3b82f6",
  Routing: "#10b981",
  "JSON-LD": "#8b5cf6",
  Architecture: "#f43f5e",
}

/** A calendar day, written the way the date picker writes `publishedAt`. */
function dayOf(dayOffset: number): string {
  const date = mondayOfThisWeek()
  date.setDate(date.getDate() + dayOffset)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function buildGalleryArticles(): Article[] {
  return ARTICLES.map((article) => {
    const { start, end, publishDay } = WRITING_SEEDS[article.id]
    return {
      ...article,
      "@id": `/${GALLERY_ARTICLES_ID}/${article.id}`,
      "@type": GALLERY_ARTICLES_ID,
      publishedAt: dayOf(publishDay),
      writingStartAt: at(...start),
      writingEndAt: at(...end),
      categoryColor: CATEGORY_COLORS[article.category],
    }
  })
}

function collection<T>(id: string, member: T[]) {
  return {
    "@id": id,
    "@type": "Collection",
    member,
    totalItems: member.length,
  }
}

let seeded = false

/**
 * Writes the fixtures, once per browser session.
 *
 * Only the first call of a session writes: after that the reader's own edits
 * are what the demos should show, and reseeding on every navigation would undo
 * them. Reloading the tab starts from the fixtures again.
 */
export function seedDemoData(): void {
  if (seeded) return
  seeded = true

  setInStorage(ARTICLES_ID, collection(ARTICLES_ID, ARTICLES))
  setInStorage(SESSIONS_ID, collection(SESSIONS_ID, buildSessions()))
  setInStorage(FEED_ID, collection(FEED_ID, buildFeed()))
  setInStorage(
    HOME_ARTICLES_ID,
    collection(
      HOME_ARTICLES_ID,
      ARTICLES.map((article) => ({
        ...article,
        "@id": `/${HOME_ARTICLES_ID}/${article.id}`,
        "@type": HOME_ARTICLES_ID,
      }))
    )
  )
  setInStorage(
    VARIANT_ARTICLES_ID,
    collection(
      VARIANT_ARTICLES_ID,
      ARTICLES.map((article) => ({
        ...article,
        "@id": `/${VARIANT_ARTICLES_ID}/${article.id}`,
        "@type": VARIANT_ARTICLES_ID,
      }))
    )
  )
  setInStorage(
    GALLERY_ARTICLES_ID,
    collection(GALLERY_ARTICLES_ID, buildGalleryArticles())
  )
  setInStorage(
    DRAWER_ARTICLES_ID,
    collection(
      DRAWER_ARTICLES_ID,
      ARTICLES.map((article) => ({
        ...article,
        "@id": `/${DRAWER_ARTICLES_ID}/${article.id}`,
        "@type": DRAWER_ARTICLES_ID,
      }))
    )
  )
}

export const ARTICLE_STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "In review", value: "review" },
  { label: "Published", value: "published" },
]

export const ARTICLE_CATEGORIES = [
  { label: "Forms", value: "Forms" },
  { label: "Views", value: "Views" },
  { label: "Routing", value: "Routing" },
  { label: "JSON-LD", value: "JSON-LD" },
  { label: "Architecture", value: "Architecture" },
]
