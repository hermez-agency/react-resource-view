import {
  DatePickerInputController,
  NumberInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import {
  CircleAlert,
  MessageSquare,
  Newspaper,
  Rocket,
  ShieldCheck,
} from "lucide-react"
import { ArticleRow } from "@/demo/ArticleRow"
import {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  ARTICLES_ID,
  DRAWER_ARTICLES_ID,
  FEED_ID,
  GALLERY_ARTICLES_ID,
  SESSIONS_ID,
  VARIANT_ARTICLES_ID,
  type Article,
  type FeedEvent,
  type Session,
} from "@/demo/data"
import spotlightLayout from "@/demo/spotlightLayout"

/**
 * The two resources every view demo on this site is built on.
 *
 * They are declared once, at module scope, because `createViewResource` writes
 * into the shared resource registry: declaring the same IRI twice from two
 * pages would register it twice. Each page then picks a layout instead of
 * declaring a resource of its own.
 *
 * None of them has a `path`: they read and write the browser's storage, which
 * `seedDemoData` fills, so every demo runs with no server behind it. Nor do
 * they declare `permissions`: everything is allowed by default, and the demos
 * want the whole CRUD surface.
 */

/** The form that drives both the create/edit views and the table's columns. */
const articleForm = {
  label: { title: "Article" },
  inputs: {
    title: { label: "Title", required: true },
    author: { label: "Author" },
    category: {
      label: "Category",
      controller: SelectInputController,
      valueOptions: ARTICLE_CATEGORIES,
    },
    status: {
      label: "Status",
      controller: SelectInputController,
      valueOptions: ARTICLE_STATUSES,
    },
    readingTime: { label: "Minutes", controller: NumberInputController },
    publishedAt: { label: "Published on", controller: DatePickerInputController },
  },
}

const articleFilters = {
  inputs: {
    title: { label: "Search a title" },
    status: {
      label: "Status",
      controller: SelectInputController,
      valueOptions: ARTICLE_STATUSES,
    },
  },
}

/** The five layouts an article reads in without a date to place it on. */
function articleLayouts() {
  return [
    layout.table(),
    // The four layouts below draw a whole record rather than a row of cells,
    // so they take a row component instead of falling back to the raw dump.
    layout.cards({ columns: 3, components: { row: ArticleRow } }),
    layout.items({ components: { row: ArticleRow } }),
    layout.board({
      groupBy: "status",
      columns: ARTICLE_STATUSES,
      components: { row: ArticleRow },
    }),
    layout.split({ readInList: true, components: { row: ArticleRow } }),
  ]
}

export const articlesResource = createViewResource<Article>(ARTICLES_ID, {
  name: "Articles",
  storage: "local",
  // A list has no separate column description: the table renders one column
  // per field of this form, which is also the form the create and edit views
  // use. One description, four screens.
  form: articleForm,
  views: {
    list: {
      filters: articleFilters,
      layouts: articleLayouts(),
    },
    // A demo sits inside a page of prose. Sending the reader to the playground
    // to edit a row would take the documentation off the screen, so both forms
    // open over the list instead — which is also the behaviour an application
    // embedding a view in a dashboard wants.
    create: { title: "New article", open: "dialog" },
    update: { open: "dialog" },
    read: { open: "dialog" },
  },
})

const sessionForm = {
  label: { title: "Session" },
  inputs: {
    title: { label: "Title", required: true },
    speaker: { label: "Speaker" },
    room: { label: "Room" },
    track: { label: "Track" },
    startAt: { label: "Starts at" },
    endAt: { label: "Ends at" },
  },
}

const feedKinds = [
  { label: "Deploy", value: "deploy" },
  { label: "Review", value: "review" },
  { label: "Incident", value: "incident" },
  { label: "Comment", value: "comment" },
]

export const feedResource = createViewResource<FeedEvent>(FEED_ID, {
  name: "Team activity",
  storage: "local",
  titleField: "summary",
  form: {
    inputs: {
      summary: { label: "Event", required: true },
      detail: { label: "Detail" },
      actor: { label: "By" },
      kind: {
        label: "Kind",
        controller: SelectInputController,
        valueOptions: feedKinds,
      },
    },
  },
  views: {
    list: {
      filters: { inputs: { summary: { label: "Search an event" } } },
      layouts: [
        layout.feed({
          dateField: "createdAt",
          titleField: "summary",
          descriptionField: "detail",
          actorField: "actor",
          typeField: "kind",
          types: {
            deploy: { icon: Rocket, color: "var(--color-view)" },
            review: { icon: ShieldCheck, color: "var(--color-form)" },
            incident: { icon: CircleAlert, color: "#dc2626" },
            comment: { icon: MessageSquare },
          },
        }),
        layout.table(),
      ],
      rowActions: ["read"],
    },
    read: { open: "dialog" },
  },
})

export const sessionsResource = createViewResource<Session>(SESSIONS_ID, {
  name: "Sessions",
  storage: "local",
  form: sessionForm,
  views: {
    list: {
      layouts: [
        layout.calendar({
          mode: "week",
          dateField: "startAt",
          endDateField: "endAt",
          titleField: "title",
          colorField: "track",
          hourStart: 8,
          hourEnd: 18,
        }),
        layout.timeline<Session>({
          startField: "startAt",
          endField: "endAt",
          titleField: "title",
          groupBy: "room",
          groupsLabel: "Rooms",
          statusField: "status",
          daysToShow: 5,
          showUnassigned: false,
          colorByStatus: {
            confirmed: "var(--color-view)",
            hold: "var(--color-form)",
          },
        }),
        layout.table(),
      ],
    },
    // Same reasoning as the articles: a schedule embedded in a page of prose
    // edits itself over the page, not somewhere else.
    create: { open: "dialog" },
    update: { open: "dialog" },
    read: { open: "dialog" },
  },
})

/**
 * The same articles in all seven layouts, for the home page's gallery.
 *
 * The five the articles already have, plus a calendar and a timeline over the
 * window each article is written in. It is a resource of its own because a
 * list draws a button for every layout its resource declares: two more on the
 * shared articles would show up on every documentation page that reads them.
 */
export const galleryArticlesResource = createViewResource<Article>(
  GALLERY_ARTICLES_ID,
  {
    name: "Articles",
    storage: "local",
    form: articleForm,
    views: {
      list: {
        filters: articleFilters,
        layouts: [
          ...articleLayouts(),
          layout.calendar({
            // A writing window runs over days, which a week's hour grid would
            // draw as one tall block: a month lays it out on the day it starts.
            mode: "month",
            dateField: "writingStartAt",
            endDateField: "writingEndAt",
            titleField: "title",
            colorField: "categoryColor",
          }),
          // Who writes what, when.
          layout.timeline<Article>({
            startField: "writingStartAt",
            endField: "writingEndAt",
            titleField: "title",
            groupBy: "author",
            groupsLabel: "Authors",
            statusField: "status",
            daysToShow: 14,
            showUnassigned: false,
            colorByStatus: {
              draft: "var(--color-muted-foreground)",
              review: "var(--color-form)",
              published: "var(--color-view)",
            },
          }),
        ],
      },
      create: { title: "New article", open: "dialog" },
      update: { open: "dialog" },
      read: { open: "dialog" },
    },
  }
)

/**
 * The same articles, with an eighth layout the package does not ship.
 *
 * `spotlightLayout.tsx` next to this file was not written by hand: it is what
 * `npx react-resource-view create-view-variant Spotlight -i Sparkles` printed,
 * kept as it came out so the "your own layout" page can run the file it
 * documents. The layout lives on a resource of its own rather than on the
 * shared articles, so the other pages keep the five layouts they describe.
 */
export const spotlightResource = createViewResource<Article>(VARIANT_ARTICLES_ID, {
  name: "Articles",
  storage: "local",
  form: articleForm,
  views: {
    list: { layouts: [spotlightLayout(), layout.table()] },
    create: { title: "New article", open: "dialog" },
    update: { open: "dialog" },
    read: { open: "dialog" },
  },
})

/**
 * The same articles again, opened in a drawer and written in two passes.
 *
 * It carries the two things the other demos deliberately do not: forms that
 * slide in as a panel rather than as a dialog, and a create form that asks for
 * less than the edit form does. It also names an `icon` and a `description`,
 * which is what the list draws its header from — so the three latest additions
 * to the package are all visible on one screen.
 */
export const drawerArticlesResource = createViewResource<Article>(
  DRAWER_ARTICLES_ID,
  {
    name: "Articles",
    icon: Newspaper,
    storage: "local",
    description: "Started in two fields, finished in six.",
    form: articleForm,
    views: {
      list: { layouts: [layout.table()] },
      // Creating asks for what a draft cannot exist without; everything else
      // is filled in later, from the edit form, which is the whole
      // `articleForm` declared at the root. The create form is merged over it,
      // so it only says what it takes away.
      create: {
        title: "New article",
        open: "drawer",
        form: {
          label: { title: "New article" },
          inputs: {
            author: false,
            status: false,
            readingTime: false,
            publishedAt: false,
          },
        },
      },
      update: { open: "drawer" },
      read: { open: "drawer" },
    },
  }
)
