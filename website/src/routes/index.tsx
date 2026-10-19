import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRight,
  Boxes,
  Check,
  Languages,
  LayoutGrid,
  Link2,
  MousePointerClick,
  X,
  PlugZap,
  ShieldCheck,
  Terminal,
} from "lucide-react"
import {
  BackendsIllustration,
  DictionaryIllustration,
  LayoutsIllustration,
  PortsIllustration,
  UrlIllustration,
  ValidationIllustration,
} from "@/components/FeatureIllustrations"
import { CodeBlock } from "@/components/CodeBlock"
import { CopyCommand } from "@/components/CopyCommand"
import { Header } from "@/components/Header"
import { HeroBackdrop } from "@/components/HeroBackdrop"
import { HomeBuilder } from "@/components/HomeBuilder"
import { LayoutGallery } from "@/components/LayoutGallery"
import { Logo } from "@/components/Logo"
import {
  FormPackageIllustration,
  ViewPackageIllustration,
} from "@/components/PackageIllustrations"
import { SiteVideo } from "@/components/SiteVideo"
import { StarterPicker } from "@/components/StarterPicker"
import {
  FrozenScreenIllustration,
  NotesViewsIllustration,
  OneDescriptionIllustration,
} from "@/components/StoryIllustrations"
import { VideoDialog } from "@/components/VideoDialog"
import { namedBackends } from "@/lib/backends"
import { FORM_SECTION, VIEW_SECTION } from "@/lib/navigation"
import { cn } from "@/lib/cn"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <BeforeAfter />
        <WhenToUse />
        <OneDescription />
        <Layouts />
        <DemoVideo />
        <Features />
        <Story />
        <Closing />
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

const PACKAGES = [
  {
    section: VIEW_SECTION,
    role: "The product",
    Illustration: ViewPackageIllustration,
    points: [
      "Seven layouts over one collection — table, cards, split, calendar…",
      "Filters, pagination and the chosen layout all live in the URL",
      "Bring your own router: four primitives, or the TanStack adapter",
    ],
  },
  {
    section: FORM_SECTION,
    role: "The form engine underneath",
    Illustration: FormPackageIllustration,
    points: [
      "34 field controllers, from a text input to a page builder",
      "Groups, steps, sub-forms and repeatable rows",
      "API Platform violations mapped straight back onto the fields",
    ],
  },
]

/**
 * The whole way in, said once: what the product is, the two packages it is
 * made of, and the one command that starts it on the reader's own API.
 *
 * On a wide screen the packages sit on the left and the command on the right,
 * read side by side; on a phone the command comes first, so it is on the
 * first screen rather than under two cards.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <HeroBackdrop />

      <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 lg:px-8 lg:pt-20 lg:pb-24">
        <header className="mx-auto max-w-4xl text-center">
          <h1
            className="rise text-balance text-[2rem] leading-tight font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem]"
            style={{ animationDelay: "100ms" }}
          >
            The back office of your REST API, generated from a{" "}
            <span className="bg-gradient-to-r from-form to-view bg-clip-text text-transparent">
              declaration
            </span>
          </h1>

          <p
            className="rise mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Lists, detail pages, forms and filters for every resource — declared
            once, never drawn by hand.
          </p>
        </header>

        <div className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
          <ul
            className="rise order-2 grid gap-4 lg:order-1"
            style={{ animationDelay: "280ms" }}
          >
            {PACKAGES.map((item) => (
              <li key={item.section.id}>
                <PackageCard {...item} />
              </li>
            ))}
          </ul>

          <div
            id="get-started"
            className="rise order-1 scroll-mt-20 rounded-2xl border border-border bg-card/85 p-4 shadow-xl backdrop-blur sm:p-6 lg:order-2"
            style={{ animationDelay: "220ms" }}
          >
            <h2 className="text-sm font-semibold tracking-tight">
              Start on the API you already have
            </h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              One command writes a Vite and React back office around it.
            </p>

            <StarterPicker />

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-5">
              <a
                href="#try"
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95"
              >
                <MousePointerClick className="size-4" />
                Try it live
              </a>
              <VideoDialog
                src="two-libraries.mp4"
                poster="two-libraries-poster.jpg"
                title="Two libraries, one idea: react-data-form and react-resource-view in one minute"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Watch the demo · 1 min
              </VideoDialog>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** One package: what it draws, what it is to the other, and three things it does. */
function PackageCard({
  section,
  role,
  Illustration,
  points,
}: (typeof PACKAGES)[number]) {
  const isForm = section.accent === "form"

  return (
    <Link
      to={`/docs/${section.id}/`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/85 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:flex-row",
        isForm ? "hover:border-form/50" : "hover:border-view/50"
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 z-10 w-1",
          isForm ? "bg-form" : "bg-view"
        )}
        aria-hidden
      />

      {/* What the package does, drawn beside its name. */}
      <div className="flex shrink-0 items-center border-b border-border bg-muted/40 bg-dotted px-4 py-3 sm:w-[40%] sm:border-r sm:border-b-0">
        <div className="aspect-[360/150] w-full">
          <Illustration />
        </div>
      </div>

      <div className="relative min-w-0 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2
            className={cn(
              "font-mono text-sm font-semibold",
              isForm ? "text-form" : "text-view"
            )}
          >
            {section.pkg}
          </h2>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{role}</p>

        <ul className="mt-3 space-y-1.5 text-[13px] leading-snug text-muted-foreground">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span
                className={cn(
                  "mt-1.5 size-1 shrink-0 rounded-full",
                  isForm ? "bg-form" : "bg-view"
                )}
              />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */

const BEFORE = [
  "A table component: columns, sorting, pagination",
  "A form component per screen, create and edit",
  "Filters wired to the query string",
  "Validation, and the API's 422 mapped back onto the fields",
  "Routes, permissions, loading and empty states — for every resource",
]

const DECLARATION = `import { createViewResource, layout } from "react-resource-view"

export const articles = createViewResource<Article>("articles", {
  name: "Articles",
  path: "/api/articles",
  form: {
    inputs: {
      title: { label: "Title", required: true },
      author: { label: "Author" },
      status: { label: "Status", controller: SelectInputController },
    },
  },
  views: {
    list: {
      filters: { inputs: { title: { label: "Search a title" } } },
      layouts: [layout.table(), layout.cards()],
    },
  },
})`

/**
 * What the library saves, said as a comparison: the same screens, written by
 * hand on one side and declared on the other.
 */
function BeforeAfter() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-view">
          Before and after
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Hundreds of lines of components, or one declaration
        </h2>
        <p className="mt-3 text-muted-foreground">
          A back office is the same work for every resource of your API. Write it
          by hand and each one costs a table, a form and its filters; declare it and
          each one costs about twenty lines.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-muted/25 p-6">
          <h3 className="font-semibold tracking-tight">By hand, per resource</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {BEFORE.map((item) => (
              <li key={item} className="flex gap-2.5">
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm font-medium">Typically a few hundred lines.</p>
        </div>

        <div className="min-w-0">
          <h3 className="mb-3 font-semibold tracking-tight">
            With react-resource-view
          </h3>
          <CodeBlock filename="resources/articles.ts">{DECLARATION}</CodeBlock>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

const USE_IT = [
  "A back office or an admin interface for your API",
  "An internal tool",
  "Business CRUD: records to list, filter, read and edit",
]

const SKIP_IT = [
  "A marketing or showcase site",
  "A very custom UI where every screen is designed one by one",
]

/** Who the library is for, and who it is not for — said before the detail. */
function WhenToUse() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          Is it for you?
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          When to use it, and when not to
        </h2>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-view/40 bg-view-soft/30 p-6">
          <h3 className="font-semibold tracking-tight">Use it for</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {USE_IT.map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-view" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border p-6">
          <h3 className="font-semibold tracking-tight">Look elsewhere for</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {SKIP_IT.map((item) => (
              <li key={item} className="flex gap-2.5">
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

/**
 * What the two packages build together, filmed: the page builder is not a
 * third product but a form (the blocks) whose records a resource lists and
 * reopens.
 */
function DemoVideo() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 lg:px-8">
      <header className="mx-auto max-w-2xl text-center">
        <p className="bg-gradient-to-r from-form to-view bg-clip-text text-xs font-medium uppercase tracking-wider text-transparent">
          Forms + views
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Put the two together and you get a page builder
        </h2>
        <p className="mt-3 text-muted-foreground">
          A page builder is not a third package. The blocks you stack and edit are a{" "}
          <strong className="font-medium whitespace-nowrap text-foreground">react-data-form</strong>{" "}
          form, saved as plain JSON; once published, the page is a record of a{" "}
          <strong className="font-medium whitespace-nowrap text-foreground">
            react-resource-view
          </strong>{" "}
          resource — listed, filtered and reopened in the back office like any
          other. The same pairing gives you a CV editor, a product sheet or a blog.
        </p>
      </header>

      <div className="mt-10">
        <SiteVideo
          src="page-builder.mp4"
          poster="page-builder-poster.jpg"
          title="The page builder: blocks declared as data, edited live"
        />
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link
          to="/playground/builder/"
          className="inline-flex items-center gap-1.5 font-medium text-foreground transition hover:text-primary"
        >
          Open the page builder yourself
          <ArrowRight className="size-4" />
        </Link>
      </p>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

function OneDescription() {
  return (
    <section id="try" className="scroll-mt-20 border-y border-border bg-muted/25 py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <header className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Written once
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            One description, every screen
          </h2>
          <p className="mt-3 text-muted-foreground">
            A list has no separate column definition. The fields you describe are the
            form the reader edits, the columns the table shows and the payload your
            API receives — so take the description below apart and watch both halves
            follow.
          </p>
        </header>

        <div className="mt-10">
          <HomeBuilder />
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    illustration: NotesViewsIllustration,
    date: "2018",
    title: "In Notion",
    body: "One set of records: a table, a board or a calendar, a click apart.",
  },
  {
    illustration: FrozenScreenIllustration,
    date: "2018 – 2022",
    title: "In a React app",
    body: "The view is frozen in the code: another view means another screen.",
  },
  {
    illustration: OneDescriptionIllustration,
    date: "2022 → today",
    title: "With react-resource-view",
    body: "Describe the resource once. The reader picks the view, and the link keeps it.",
  },
]

/**
 * Where the library comes from — the Notion comparison, told in three pictures.
 *
 * It sits near the end, after the argument: it is a good story, but told before
 * the reader knows what the library is for, it would interrupt the pitch.
 */
function Story() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          Where it comes from
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Build your application the way you build a Notion project
        </h2>
        <p className="mt-3 text-muted-foreground">
          We moved from Evernote to Notion in 2018, and missed its views in every
          app we wrote.
        </p>
      </header>

      <ol className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-12">
        {STEPS.map(({ illustration: Illustration, date, title, body }, index) => (
          <li key={title} className="relative">
            {index > 0 && (
              <ArrowRight
                className="absolute top-[calc(50%-4.5rem)] -left-9 hidden size-5 text-muted-foreground/60 lg:block"
                aria-hidden
              />
            )}
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <Illustration />
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">{date}</p>
            <h3 className="mt-1 font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

function Layouts() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-view">
          Read many ways
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Seven layouts, one resource
        </h2>
        <p className="mt-3 text-muted-foreground">
          A layout is a line in{" "}
          <code className="font-mono text-sm">views.list.layouts</code>, not a
          screen you build. Declare several and the reader picks — the
          filters, the permissions and the forms carry over untouched.
        </p>
      </header>

      <div className="mt-10">
        <LayoutGallery />
      </div>

      {/* The eighth layout is the reader's, and the command that writes it is
          the shortest sentence on this page. It sits right under the gallery,
          read as the next one along — and the link is the button, not the
          card, so copying the command does not navigate away. */}
      <div className="mt-4 rounded-2xl border border-view/50 bg-gradient-to-br from-view-soft to-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex min-w-0 gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-view text-background">
              <Terminal className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-tight">
                The eighth layout is yours
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your own layout: one file — three components and a{" "}
                <code className="font-mono text-xs">layout.custom()</code> call. One
                command writes it where you want it.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto lg:shrink-0">
            <CopyCommand command="npx react-resource-view create-view-variant" />
            <Link
              to="/docs/resource-view/custom-variant/"
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-view px-4 py-2.5 text-sm font-medium text-background no-underline transition hover:opacity-90"
            >
              Read the guide
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    icon: Link2,
    illustration: UrlIllustration,
    title: "The URL is the state",
    body: "Filters, pagination, the chosen layout and the open item all live in the address bar. A shared link reopens exactly what the sender was looking at.",
  },
  {
    icon: PlugZap,
    illustration: PortsIllustration,
    title: "Ports, not assumptions",
    body: "Neither package knows your router, your API client or your brand. Each touch point is a port with a default, injected once at startup.",
  },
  {
    icon: Boxes,
    illustration: BackendsIllustration,
    title: "Five backends, plus any REST API",
    body: `A dialect holds what each backend spells differently — pages, filters, envelopes, errors — so one declared resource renders against ${namedBackends()}, any REST API that publishes OpenAPI, or a dialect you write.`,
  },
  {
    icon: ShieldCheck,
    illustration: ValidationIllustration,
    title: "Validation on both sides",
    body: "A validator per field for the browser, and a mapper that puts a 422 from the server back on the fields that caused it.",
  },
  {
    icon: Languages,
    illustration: DictionaryIllustration,
    title: "One dictionary",
    body: "Labels go through react-mini-i18n, so your application and the libraries translate from the same place.",
  },
  {
    icon: LayoutGrid,
    illustration: LayoutsIllustration,
    title: "Seven layouts, and yours",
    body: "Table, cards, item list, columns, split, calendar and timeline — declared side by side, switched by the reader. An eighth of your own is one command and one file.",
  },
]

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
        Opinionated about description, agnostic about everything else
      </h2>

      <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, illustration: Illustration, title, body }) => (
          <article
            key={title}
            className="group relative bg-background p-6 transition-colors hover:bg-muted/40"
          >
            <span
              className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
              aria-hidden
            />
            <div className="mb-5 rounded-xl border border-border bg-muted/30 p-2">
              <Illustration />
            </div>
            <h3 className="flex items-center gap-2 font-semibold tracking-tight">
              <Icon
                className="size-4 shrink-0 text-primary transition-transform duration-300 group-hover:-translate-y-0.5"
                aria-hidden
              />
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          to="/docs/resource-view/concepts/"
          className="inline-flex items-center gap-1.5 font-medium text-foreground transition hover:text-view"
        >
          Resource, dialect, port, scope — the concepts and how they fit together
          <ArrowRight className="size-4" />
        </Link>
      </p>
    </section>
  )
}

/* -------------------------------------------------------------------------- */

function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-form-soft/60 via-background to-view-soft/60 p-10 text-center">
        <Logo className="mx-auto size-10" />
        <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          Declare a resource, and keep the forms for later
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          The quickstart goes from zero to a list on your API in five minutes. The
          form package it builds on stands on its own, when all you need is a form.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs/resource-view/quickstart/"
            className="rounded-lg bg-view px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            react-resource-view
          </Link>
          <Link
            to="/docs/form/"
            className="rounded-lg bg-form px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
          >
            react-data-form
          </Link>
        </div>

        <p className="mt-7 text-sm text-muted-foreground">
          A Hermez product —{" "}
          <a
            href="https://hermez.dev"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition hover:text-foreground"
          >
            hermez.dev
          </a>
          .
        </p>
      </div>
    </section>
  )
}
