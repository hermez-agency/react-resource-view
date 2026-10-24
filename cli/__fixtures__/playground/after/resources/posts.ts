import { MessageSquare, ScrollText } from "lucide-react"
import {
  DatePickerInputController,
  NumberInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { PAGE_BLOCK } from "@/demo/builder/blocks"
import { createBlockBuilderInput } from "@/demo/builder/BlockBuilderInput"
import { BUILDER_FORM_COMPONENTS } from "@/demo/builder/BuilderForm"
import { PostBuilder } from "@/demo/playground/PostBuilder"
import { PostRow } from "@/demo/playground/adminRows"
import {
  COMMENTS_ID,
  POST_CATEGORIES,
  POST_STATUSES,
  POSTS_ID,
  type Post,
} from "@/demo/playground/adminData"
import { DRAWER, POPUP } from "@/demo/playground/shared"

/** The fields of a post, next to the blocks it is assembled from. */
const FIELDS = {
  title: { label: "Title", required: true },
  author: { label: "Author" },
  category: {
    label: "Category",
    controller: SelectInputController,
    valueOptions: POST_CATEGORIES,
  },
  status: {
    label: "Status",
    controller: SelectInputController,
    valueOptions: POST_STATUSES,
  },
  publishedAt: {
    label: "Published on",
    controller: DatePickerInputController,
  },
  views: { label: "Views", controller: NumberInputController },
}

/**
 * The blog, and the pages of the site with it: one collection, because both are
 * a handful of fields and a stack of blocks. This is the page builder of the
 * back office — `blocks` is an array of forms rather than a field, and what a
 * post is made of is decided record by record, in the editor.
 *
 * Four layouts over the same fields — and the board is the one to try: drag a
 * post from "Draft" to "Published" and the record is updated, no code written
 * for it here.
 */
export const postsResource = createViewResource<Post>(POSTS_ID, {
  name: "Posts",
  icon: ScrollText,
  storage: "local",
  description:
    "The blog and the pages of the site, from the first draft to the day one goes out. Open one: it is assembled block by block. Try the board too — dragging a card moves the post to that status.",
  form: {
    // The fields of the record folded into a "Settings" panel, the blocks
    // under them, and a save bar rather than a full-width button: the screen
    // is about the document, so the document is what it shows.
    components: BUILDER_FORM_COMPONENTS,
    inputs: {
      ...FIELDS,
      // What the post is: the palette of the landing-page kit, every form
      // tagged `page-block` and nothing else — the same field, and the same
      // blocks, as `/playground/builder`.
      blocks: createBlockBuilderInput({
        label: "Content",
        forms: [PAGE_BLOCK],
        addLabel: "Add a first block",
      }),
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          title: { label: "Search a title" },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: POST_STATUSES,
          },
        },
      },
      layouts: [
        // A layout may carry a form of its own, and the table is where that
        // earns its keep: one column per field is right for the six fields and
        // wrong for the blocks, which are a stack of forms and belong in the
        // editor. Every other layout keeps the whole declaration.
        layout.table({
          fields: ["title", "author", "category", "status", "publishedAt", "views"],
          form: { inputs: FIELDS },
        }),
        // One column per status: the editorial pipeline, and a drop target that
        // writes the new status back through the same repository the table uses.
        layout.board({
          groupBy: "status",
          columns: POST_STATUSES,
          components: { row: PostRow },
        }),
        layout.cards({
          columns: 3,
          components: { row: PostRow },
          // 0.x drew this row unframed: drop `frame` if it draws no card of its own.
          frame: false,
        }),
        // The list on the left, the edit form on the right; a link to `read/{id}`
        // lands on the split with that post open.
        layout.split({ readInList: true, components: { row: PostRow } }),
      ],
    },
    // A block array is a long form — the palette, one card per block, dragged
    // into order — so creation gets the sliding panel rather than a centred
    // dialog. Editing keeps the page: a post has its comments underneath.
    create: { title: "New post", ...DRAWER },
    // The other shape `subViewResource` can take: a column beside the sub-view
    // rather than a bar above it, set with `orientation: "vertical"` — the
    // users resource keeps the default, scrolling bar for comparison.
    update: {
      title: "Edit a post",
      components: {
        // Editing a post *is* the page builder: the blocks on the left, the page
        // they publish as on the right, on this record rather than on a sample.
        // The comments underneath are unaffected — a `viewComponent` replaces the
        // form, not the sub-views around it.
        view: PostBuilder,
      },
      tabs: {
        orientation: "vertical",
        items: [
          {
            id: "comments",
            label: "Comments",
            icon: MessageSquare,
            description: "What readers left under this post.",
            resource: COMMENTS_ID,
            filter: ({ item }) => ({ post: (item as Post | undefined)?.title }),
            defaultData: ({ item }) => ({ post: (item as Post | undefined)?.title }),
          },
        ],
      },
    },
    delete: { title: "Delete a post", ...POPUP },
  },
})
