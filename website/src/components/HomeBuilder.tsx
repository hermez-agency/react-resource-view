import { useMemo, useState, type ReactNode } from "react"
import { ClientOnly } from "@tanstack/react-router"
import {
  ActionList,
  DatePickerInputController,
  DurationInputController,
  NumberInputController,
  SelectButtonInputController,
  SelectInputController,
  SelectRadioInputController,
  TextAreaInputController,
  type FormInterface,
  type InputControllerComponentInterface,
  type ValueOptionInterface,
} from "react-data-form"
import {
  createViewResource,
  layout,
  ViewResourceContextProvider,
} from "react-resource-view"
import { Check, Code2, Eye, RotateCcw, Table2 } from "lucide-react"
import { CodeBlock } from "@/components/CodeBlock"
import { FormDemo } from "@/components/FormDemo"
import { ArticleRow } from "@/demo/ArticleRow"
import {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  HOME_ARTICLES_ID,
  seedDemoData,
  type Article,
} from "@/demo/data"
import { cn } from "@/lib/cn"

/* -------------------------------------------------------------------------- */
/* The description the reader edits                                            */
/* -------------------------------------------------------------------------- */

interface ControllerChoice {
  id: string
  label: string
  /** Left out of the generated snippet when the field uses the default. */
  name?: string
  controller?: InputControllerComponentInterface
  /** Emitted verbatim after `controller`, for the options a picker needs. */
  options?: { code: string; value: ValueOptionInterface[] }
}

interface FieldSpec {
  name: string
  label: string
  hint: string
  on: boolean
  required: boolean
  controllers: ControllerChoice[]
}

const STATUS_OPTIONS = {
  code: "ARTICLE_STATUSES",
  value: ARTICLE_STATUSES,
}

const CATEGORY_OPTIONS = {
  code: "ARTICLE_CATEGORIES",
  value: ARTICLE_CATEGORIES,
}

/**
 * Every field the reader can put in, and the controllers it can be drawn with.
 *
 * The list is deliberately the same six fields the documentation's article
 * resource uses: what the reader assembles here is the object they will meet
 * again on the first page of the guide.
 */
const FIELDS: FieldSpec[] = [
  {
    name: "title",
    label: "Title",
    hint: "text",
    on: true,
    required: true,
    controllers: [
      { id: "default", label: "Input" },
      {
        id: "textarea",
        label: "Textarea",
        name: "TextAreaInputController",
        controller: TextAreaInputController,
      },
    ],
  },
  {
    name: "author",
    label: "Author",
    hint: "text",
    on: true,
    required: false,
    controllers: [{ id: "default", label: "Input" }],
  },
  {
    name: "category",
    label: "Category",
    hint: "one of five",
    on: false,
    required: false,
    controllers: [
      {
        id: "select",
        label: "Select",
        name: "SelectInputController",
        controller: SelectInputController,
        options: CATEGORY_OPTIONS,
      },
      {
        id: "buttons",
        label: "Buttons",
        name: "SelectButtonInputController",
        controller: SelectButtonInputController,
        options: CATEGORY_OPTIONS,
      },
    ],
  },
  {
    name: "status",
    label: "Status",
    hint: "draft · review · published",
    on: true,
    required: false,
    controllers: [
      {
        id: "select",
        label: "Select",
        name: "SelectInputController",
        controller: SelectInputController,
        options: STATUS_OPTIONS,
      },
      {
        id: "radio",
        label: "Radio",
        name: "SelectRadioInputController",
        controller: SelectRadioInputController,
        options: STATUS_OPTIONS,
      },
      {
        id: "buttons",
        label: "Buttons",
        name: "SelectButtonInputController",
        controller: SelectButtonInputController,
        options: STATUS_OPTIONS,
      },
    ],
  },
  {
    name: "readingTime",
    label: "Minutes",
    hint: "number",
    on: true,
    required: false,
    controllers: [
      {
        id: "number",
        label: "Number",
        name: "NumberInputController",
        controller: NumberInputController,
      },
      {
        id: "duration",
        label: "Duration",
        name: "DurationInputController",
        controller: DurationInputController,
      },
    ],
  },
  {
    name: "publishedAt",
    label: "Published on",
    hint: "date",
    on: false,
    required: false,
    controllers: [
      {
        id: "picker",
        label: "Date picker",
        name: "DatePickerInputController",
        controller: DatePickerInputController,
      },
    ],
  },
]

interface FieldState {
  on: boolean
  required: boolean
  controller: string
}

type BuilderState = Record<string, FieldState>

function initialState(): BuilderState {
  return Object.fromEntries(
    FIELDS.map((field) => [
      field.name,
      {
        on: field.on,
        required: field.required,
        controller: field.controllers[0]!.id,
      },
    ])
  )
}

function chosenController(field: FieldSpec, state: FieldState): ControllerChoice {
  return (
    field.controllers.find((choice) => choice.id === state.controller) ??
    field.controllers[0]!
  )
}

/** The fields that are in, in declaration order — which is also column order. */
function activeFields(state: BuilderState): FieldSpec[] {
  return FIELDS.filter((field) => state[field.name]!.on)
}

/* -------------------------------------------------------------------------- */
/* …and what comes out of it                                                   */
/* -------------------------------------------------------------------------- */

function buildForm(state: BuilderState): FormInterface {
  const inputs: FormInterface["inputs"] = {}

  for (const field of activeFields(state)) {
    const current = state[field.name]!
    const choice = chosenController(field, current)

    inputs[field.name] = {
      label: field.label,
      ...(current.required ? { required: true } : {}),
      ...(choice.controller ? { controller: choice.controller } : {}),
      ...(choice.options ? { valueOptions: choice.options.value } : {}),
    }
  }

  return { label: { title: "Article", submit: "Publish" }, inputs }
}

function buildSnippet(state: BuilderState): string {
  const lines = ["const articleForm = {", "  inputs: {"]

  for (const field of activeFields(state)) {
    const current = state[field.name]!
    const choice = chosenController(field, current)
    const parts = [`label: ${JSON.stringify(field.label)}`]

    if (current.required) parts.push("required: true")
    if (choice.name) parts.push(`controller: ${choice.name}`)
    if (choice.options) parts.push(`valueOptions: ${choice.options.code}`)

    const inline = `    ${field.name}: { ${parts.join(", ")} },`

    if (inline.length <= 80) {
      lines.push(inline)
    } else {
      lines.push(`    ${field.name}: {`)
      parts.forEach((part) => lines.push(`      ${part},`))
      lines.push("    },")
    }
  }

  lines.push("  },", "}", "")
  lines.push("// The form the reader fills in…")
  lines.push("useForm({ form: articleForm })")
  lines.push("")
  lines.push("// …and the columns the list draws. Same object, no second description.")
  lines.push('createViewResource("articles", {')
  lines.push('  path: "/api/articles",')
  lines.push("  form: articleForm,")
  lines.push("  views: { list: { layouts: [layout.table()] } },")
  lines.push("})")

  return lines.join("\n")
}

/**
 * Rebuilt whenever the description changes.
 *
 * `createViewResource` registers under an IRI, so calling it again with the
 * same one replaces the entry rather than adding a second — which is exactly
 * what a live editor wants. The landing page owns that IRI; the documentation's
 * article resource keeps its own.
 */
function buildResource(form: FormInterface) {
  return createViewResource<Article>(HOME_ARTICLES_ID, {
    name: "Articles",
    // The landing page runs on the browser's storage, seeded like the
    // documentation's demos: there is no server behind it.
    storage: "local",
    form,
    views: {
      list: {
        layouts: [
          layout.table(),
          layout.cards({ columns: 2, components: { row: ArticleRow } }),
        ],
      },
      // The builder is the page; nothing it opens may leave it.
      create: { title: "New article", open: "dialog" },
      update: { open: "dialog" },
      read: { open: "dialog" },
    },
  })
}

/* -------------------------------------------------------------------------- */
/* The component                                                               */
/* -------------------------------------------------------------------------- */

type Panel = "form" | "list" | "code"

const PANELS: Array<{ id: Panel; label: string; icon: typeof Eye }> = [
  { id: "form", label: "The form", icon: Eye },
  { id: "list", label: "The list", icon: Table2 },
  { id: "code", label: "The description", icon: Code2 },
]

/**
 * The landing page's editable description.
 *
 * The claim the two packages make is hard to believe from prose alone: that a
 * list has no column definition, because the fields *are* the columns. So the
 * page hands the description over. Turn a field off and it leaves the form and
 * the table together; change its controller and both the input and the cell
 * change with it. Nothing here is a mock-up — it is `useForm` and
 * `ViewResourceContextProvider`, on a real repository.
 */
export function HomeBuilder() {
  const [state, setState] = useState<BuilderState>(initialState)
  const [panel, setPanel] = useState<Panel>("form")

  const form = useMemo(() => buildForm(state), [state])
  const snippet = useMemo(() => buildSnippet(state), [state])

  // The provider and the form are remounted on every change rather than
  // updated in place: a resource is a declaration, and swapping one for another
  // mid-flight is not something an application ever asks of the view — nor of
  // `useForm`, which reads its `form` once, when it mounts.
  const signature = useMemo(
    () =>
      activeFields(state)
        .map((field) => {
          const current = state[field.name]!
          return `${field.name}:${current.controller}:${current.required}`
        })
        .join("|"),
    [state]
  )

  const columns = activeFields(state).length
  const dirty = JSON.stringify(state) !== JSON.stringify(initialState())

  function update(name: string, patch: Partial<FieldState>) {
    setState((previous) => ({
      ...previous,
      [name]: { ...previous[name]!, ...patch },
    }))
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Live — edit the description
        </p>

        {dirty && (
          <button
            type="button"
            onClick={() => setState(initialState())}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        )}

        <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-background p-0.5">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                panel === id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[11px] font-medium text-muted-foreground">
            Fields · {columns} column{columns === 1 ? "" : "s"}
          </p>

          <ul className="space-y-1.5">
            {FIELDS.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                state={state[field.name]!}
                canTurnOff={columns > 1}
                onChange={(patch) => update(field.name, patch)}
              />
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            The table has no column list of its own. Every switch above moves the
            form and the list at the same time — because they read the same object.
          </p>
        </div>

        <div className="min-w-0 p-5">
          {panel === "code" ? (
            <CodeBlock className="my-0">{snippet}</CodeBlock>
          ) : (
            <ClientOnly fallback={<PanelSkeleton />}>
              {panel === "form" ? (
                <FormDemo key={signature} form={form} showPayload={false} />
              ) : (
                <BuilderList form={form} signature={signature} />
              )}
            </ClientOnly>
          )}
        </div>
      </div>
    </div>
  )
}

function FieldControl({
  field,
  state,
  canTurnOff,
  onChange,
}: {
  field: FieldSpec
  state: FieldState
  canTurnOff: boolean
  onChange: (patch: Partial<FieldState>) => void
}) {
  const disabled = state.on && !canTurnOff

  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2 transition-colors",
        state.on ? "border-border bg-background" : "border-dashed border-border"
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={state.on}
          aria-label={`${state.on ? "Remove" : "Add"} the ${field.label} field`}
          disabled={disabled}
          onClick={() => onChange({ on: !state.on })}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
            state.on
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-transparent hover:border-primary/60",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <Check className="size-3" />
        </button>

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            state.on ? "font-medium" : "text-muted-foreground"
          )}
        >
          {field.label}
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            {field.hint}
          </span>
        </span>

        <button
          type="button"
          aria-pressed={state.required}
          onClick={() => onChange({ required: !state.required })}
          disabled={!state.on}
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
            state.required
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border text-muted-foreground hover:text-foreground",
            !state.on && "invisible"
          )}
        >
          required
        </button>
      </div>

      {state.on && field.controllers.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1 pl-6.5">
          {field.controllers.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChange({ controller: choice.id })}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] transition-colors",
                state.controller === choice.id
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

/** The list half — a real view, on the localStorage repository. */
function BuilderList({
  form,
  signature,
}: {
  form: FormInterface
  signature: string
}) {
  // Seeding is synchronous and has to happen before the provider's first fetch.
  useState(() => {
    seedDemoData()
    return null
  })

  const resource = useMemo(() => buildResource(form), [form])

  return (
    <div className="min-w-0">
      <ViewResourceContextProvider
        key={signature}
        resource={resource}
        resourceAction={ActionList.list}
        viewVariantId="table"
        scope="home"
      />
    </div>
  )
}

function PanelSkeleton(): ReactNode {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-9 w-full rounded-lg bg-muted" />
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="h-9 w-full rounded-lg bg-muted" />
      <div className="h-9 w-28 rounded-lg bg-muted" />
    </div>
  )
}
