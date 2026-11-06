import { useRef, useState, type ReactNode } from "react"
import {
  FormInputController,
  getForm,
  getForms,
  getFormLabel,
  getFormType,
  type FormInputInterface,
  type FormResourceItem,
  type InputControllerInterface,
} from "react-data-form"
import {
  ChevronDown,
  Copy,
  GripVertical,
  LayoutGrid,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import type { BuilderBlock } from "@/demo/builder/blocks"
import { summariseBlock } from "@/demo/builder/blockSummary"
import { cn } from "@/lib/cn"

/**
 * The outline of a document, as the field that holds it.
 *
 * `react-data-form` ships its own array-of-forms controller, and the builder
 * screens used it until now: a grip, a numeric `order`, the name of the block
 * type. It says what a block *is* and never what it *says*, which is why five
 * "Experience" rows were five identical rows — and typing 3 into a box is not
 * how anybody moves a paragraph.
 *
 * So this is the same field with a card of its own, written where the
 * application lives rather than in the library: `controller` is the seam the
 * form description already offers, and everything below is drawn by the site.
 * The value going in and out is unchanged — an array of blocks, each one an
 * object whose `type` names the form that edits it — so a document written
 * here opens in any other builder of the package.
 */

interface BlockBuilderInputInterface extends FormInputInterface<BuilderBlock[]> {
  /** The palette: every form carrying one of these `@for` tags. */
  forms?: string[]
  /** What the empty list offers to add, in the reader's words. */
  addLabel?: string
  /** What the button under a list that already has blocks says. */
  appendLabel?: string
}

export function createBlockBuilderInput(
  options: Omit<BlockBuilderInputInterface, "controller">
): FormInputInterface {
  return { ...options, controller: BlockBuilderInputController }
}

/** The key the blocks are ordered by, the same one the library defaults to. */
const ORDER = "order"

function uniqueId(): string {
  return `block-${Math.random().toString(36).slice(2, 10)}`
}

/** Renumbers a list so `order` is the position, which is all it ever meant. */
function reindex(blocks: BuilderBlock[]): BuilderBlock[] {
  return blocks.map((block, index) => ({ ...block, [ORDER]: index }))
}

function BlockBuilderInputController({
  formInput,
  onChange,
}: InputControllerInterface<BlockBuilderInputInterface>) {
  const [blocks, setBlocks] = useState<BuilderBlock[]>(() =>
    reindex(formInput.value ?? [])
  )
  const [openId, setOpenId] = useState<string | undefined>(undefined)
  /** Where the palette is open, as an index of the list — `undefined` is shut. */
  const [paletteAt, setPaletteAt] = useState<number | undefined>(undefined)
  const [drag, setDrag] = useState<{ id: string; over: number } | undefined>()
  const listRef = useRef<HTMLDivElement>(null)

  const palette = formInput.forms ? getForms(formInput.forms) : []

  const commit = (next: BuilderBlock[]) => {
    const ordered = reindex(next)
    setBlocks(ordered)
    onChange({ ...formInput, value: ordered })
  }

  const insert = (form: FormResourceItem, at: number) => {
    const block: BuilderBlock = { id: uniqueId(), type: getFormType(form) }
    const next = [...blocks]
    next.splice(at, 0, block)
    commit(next)
    setOpenId(block.id)
    setPaletteAt(undefined)
  }

  const duplicate = (index: number) => {
    const copy = { ...blocks[index], id: uniqueId() }
    const next = [...blocks]
    next.splice(index + 1, 0, copy)
    commit(next)
    setOpenId(copy.id)
  }

  const remove = (index: number) => {
    commit(blocks.filter((_, position) => position !== index))
  }

  const update = (index: number, value: BuilderBlock) => {
    commit(blocks.map((block, position) => (position === index ? value : block)))
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return
    const next = [...blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commit(next)
  }

  /** Which interval the pointer is over, from the cards' own boxes. */
  const intervalAt = (clientY: number) => {
    const cards = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-block-card]") ?? []
    )

    for (let index = 0; index < cards.length; index++) {
      const box = cards[index].getBoundingClientRect()
      if (clientY < box.top + box.height / 2) return index
    }

    return cards.length
  }

  /**
   * Dragging, on pointer events rather than on the HTML5 drag API.
   *
   * The native one emits nothing under a finger, which is half the people who
   * will ever open this, and it offers no way to say *between which two* blocks
   * the drop would land — so the insertion line is drawn from the pointer's own
   * position, and the same code serves mouse, pen and touch.
   *
   * The listeners are hung on the window from the handler itself rather than
   * from an effect: a drag that begins and ends inside one frame — a short
   * flick, a synthetic event — would otherwise start before anything was
   * listening.
   */
  const startDrag = (event: { preventDefault: () => void }, index: number) => {
    event.preventDefault()

    const id = blocks[index].id as string
    let over = index
    setDrag({ id, over })

    const onMove = (moved: PointerEvent) => {
      const next = intervalAt(moved.clientY)
      if (next === over) return
      over = next
      setDrag({ id, over })
    }

    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)

      setDrag(undefined)
      move(index, over > index ? over - 1 : over)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
  }

  return (
    <div className="space-y-1" ref={listRef}>
      {blocks.length === 0 && paletteAt === undefined && (
        <button
          type="button"
          onClick={() => setPaletteAt(0)}
          className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {formInput.addLabel ?? "Add a first block"}
          </span>
          <span className="text-xs text-muted-foreground">
            {palette.length} block types to pick from
          </span>
        </button>
      )}

      {blocks.map((block, index) => (
        <div key={block.id ?? index}>
          <Gap
            open={paletteAt === index}
            dropping={drag?.over === index}
            palette={palette}
            onOpen={() => setPaletteAt(index)}
            onClose={() => setPaletteAt(undefined)}
            onPick={(form) => insert(form, index)}
          />

          <BlockCard
            block={block}
            index={index}
            count={blocks.length}
            open={openId === block.id}
            dragging={drag?.id === block.id}
            onToggle={() =>
              setOpenId((current) => (current === block.id ? undefined : block.id))
            }
            onGrab={(event) => startDrag(event, index)}
            onMove={(to) => move(index, to)}
            onDuplicate={() => duplicate(index)}
            onRemove={() => remove(index)}
            onChange={(value) => update(index, value)}
          />
        </div>
      ))}

      {/* The last interval — and the only one there is while the document is
          empty, which is where the button above opens the palette. */}
      {(blocks.length > 0 || paletteAt !== undefined) && (
        <Gap
          open={paletteAt === blocks.length}
          dropping={drag?.over === blocks.length}
          palette={palette}
          onOpen={() => setPaletteAt(blocks.length)}
          onClose={() => setPaletteAt(undefined)}
          onPick={(form) => insert(form, blocks.length)}
          appendLabel={formInput.appendLabel ?? "Add a block"}
        />
      )}
    </div>
  )
}

/**
 * The space between two blocks: where one lands, and where the next is added.
 *
 * The library's palette is a dialog whose own text says the block "lands at the
 * end", so building a page in the order one thinks of it means adding then
 * dragging. Here the `+` belongs to an interval, and the palette opens knowing
 * which one.
 *
 * The last interval is the one people add from, so it is not a `+` waiting for
 * a hover: it is a labelled button the width of the list, readable at rest and
 * tall enough for a thumb.
 */
function Gap({
  open,
  dropping,
  palette,
  onOpen,
  onClose,
  onPick,
  appendLabel,
}: {
  open: boolean
  dropping: boolean
  palette: FormResourceItem[]
  onOpen: () => void
  onClose: () => void
  onPick: (form: FormResourceItem) => void
  /** Set on the last interval only, which draws a button rather than a `+`. */
  appendLabel?: string
}) {
  if (open) {
    return (
      <div className="my-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground ">
            Insert a block
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the palette"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {palette.map((form) => {
            const Icon = (form.icon ?? LayoutGrid) as typeof LayoutGrid

            return (
              <button
                key={form["@id"]}
                type="button"
                onClick={() => onPick(form)}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{getFormLabel(form)}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* Where the dragged block would land — two pixels, between the right pair
     of cards, instead of the whole target card changing colour. */
  const dropLine = (
    <span
      className={cn(
        "absolute inset-x-0 h-0.5 rounded-full transition-colors",
        dropping ? "bg-primary" : "bg-transparent"
      )}
    />
  )

  if (appendLabel !== undefined) {
    return (
      <div>
        <div className="relative flex h-2 items-center">{dropLine}</div>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground/50 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:border-primary focus-visible:bg-primary/5 focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <Plus className="size-4 shrink-0" />
          {appendLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="group/gap relative flex h-2 items-center">
      {dropLine}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Add a block here"
        className="mx-auto flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 transition-opacity group-hover/gap:opacity-100 hover:border-primary hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        <Plus className="size-3" />
      </button>
    </div>
  )
}

function BlockCard({
  block,
  index,
  count,
  open,
  dragging,
  onToggle,
  onGrab,
  onMove,
  onDuplicate,
  onRemove,
  onChange,
}: {
  block: BuilderBlock
  index: number
  count: number
  open: boolean
  dragging: boolean
  onToggle: () => void
  onGrab: (event: { preventDefault: () => void }) => void
  onMove: (to: number) => void
  onDuplicate: () => void
  onRemove: () => void
  onChange: (block: BuilderBlock) => void
}) {
  const summary = summariseBlock(block)
  const Icon = summary.icon ?? LayoutGrid

  return (
    <div
      data-block-card
      className={cn(
        "group rounded-xl border bg-card transition-colors",
        open ? "border-primary/40 shadow-sm" : "border-border hover:border-foreground/20",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onPointerDown={onGrab}
          onKeyDown={(event) => {
            if (!event.altKey) return
            if (event.key === "ArrowUp") onMove(index - 1)
            else if (event.key === "ArrowDown") onMove(index + 1)
            else return
            event.preventDefault()
          }}
          aria-label={`Move this block — ${index + 1} of ${count}. Alt and the arrow keys move it too.`}
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 text-left focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          {summary.thumbnail ? (
            <img
              src={summary.thumbnail}
              alt=""
              className="size-9 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {summary.title}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {summary.detail}
            </span>
          </span>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-colors",
              open && "rotate-180"
            )}
          />
        </button>

        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconAction label="Duplicate this block" onClick={onDuplicate}>
            <Copy className="size-3.5" />
          </IconAction>
          <IconAction label="Delete this block" onClick={onRemove} destructive>
            <Trash2 className="size-3.5" />
          </IconAction>
        </span>
      </div>

      {open && (
        <div className="border-t border-border px-3 pb-3">
          {/* The fields of this one block, drawn by the form its `type` names.
              The library's own nested form controller: whatever the palette
              gains, this keeps rendering it, and every keystroke comes back up
              through `onChange` — which is what the preview redraws from.

              Its `id`, `type` and `order` are not inputs of that form; they
              survive as generated values, so what comes back is the block
              rather than the fields of the block. */}
          <FormInputController
            formInput={{
              value: block,
              form: block.type ? getForm({ type: block.type }) : undefined,
            }}
            onChange={(input) => onChange(input.value as BuilderBlock)}
          />
        </div>
      )}
    </div>
  )
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
        destructive
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}
