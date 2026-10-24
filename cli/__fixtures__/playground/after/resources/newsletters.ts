import { Mail } from "lucide-react"
import {
  DatePickerInputController,
  SelectButtonInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { createBlockBuilderInput } from "@/demo/builder/BlockBuilderInput"
import { BUILDER_FORM_COMPONENTS } from "@/demo/builder/BuilderForm"
import { BRAND_COLORS, EMAIL_BLOCK } from "@/demo/builder/emailBlocks"
import { NewsletterBuilder } from "@/demo/playground/NewsletterBuilder"
import { NewsletterBuilderLink } from "@/demo/playground/NewsletterBuilderLink"
import { NewsletterRow } from "@/demo/playground/adminRows"
import {
  NEWSLETTER_STATUSES,
  NEWSLETTERS_ID,
  type Newsletter,
} from "@/demo/playground/adminData"
import { DRAWER, POPUP } from "@/demo/playground/shared"

/** The envelope and the schedule of a newsletter, next to its blocks. */
const FIELDS = {
  subject: { label: "Subject", required: true },
  preheader: { label: "Preheader" },
  fromName: { label: "Sender name" },
  brandColor: {
    label: "Brand colour",
    controller: SelectButtonInputController,
    valueOptions: BRAND_COLORS,
  },
  status: {
    label: "Status",
    controller: SelectInputController,
    valueOptions: NEWSLETTER_STATUSES,
  },
  sendAt: { label: "Send on", controller: DatePickerInputController },
}

/**
 * The newsletters of the roastery — the posts of the email builder.
 *
 * A newsletter is an envelope and a stack of blocks, exactly as a post is a few
 * fields and a stack of blocks; only the palette differs (`email-block`), and
 * what the blocks compile to: the HTML of an email rather than a page. The
 * editor is the email builder, through `viewComponent`, and the kit "Email" of
 * `/playground/builder` saves here.
 *
 * Nothing is sent from here — the site is static, and a public form that sent
 * mail would be a relay for spam. The status is bookkeeping.
 */
export const newslettersResource = createViewResource<Newsletter>(NEWSLETTERS_ID, {
  name: "Newsletters",
  icon: Mail,
  storage: "local",
  description:
    "The emails the roastery sends, from the draft to the day they go out. Open one: it is assembled block by block, and the preview is the HTML a mailbox receives.",
  form: {
    components: BUILDER_FORM_COMPONENTS,
    inputs: {
      ...FIELDS,
      blocks: createBlockBuilderInput({
        label: "Content",
        forms: [EMAIL_BLOCK],
        addLabel: "Add a first block",
      }),
    },
  },
  views: {
    list: {
      components: { top: NewsletterBuilderLink },
      filters: {
        inputs: {
          subject: { label: "Search a subject" },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: NEWSLETTER_STATUSES,
          },
        },
      },
      layouts: [
        layout.table({ fields: ["subject", "fromName", "status", "sendAt"] }),
        layout.board({
          groupBy: "status",
          columns: NEWSLETTER_STATUSES,
          components: { row: NewsletterRow },
        }),
        layout.cards({
          columns: 3,
          components: { row: NewsletterRow },
          // 0.x drew this row unframed: drop `frame` if it draws no card of its own.
          frame: false,
        }),
      ],
    },
    create: { title: "New newsletter", ...DRAWER },
    // Editing a newsletter is the email builder, on this record.
    update: {
      title: "Edit a newsletter",
      components: { view: NewsletterBuilder },
    },
    delete: { title: "Delete a newsletter", ...POPUP },
  },
})
