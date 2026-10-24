import {
  Building2,
  Coffee,
  FileText,
  Handshake,
  Inbox,
  NotebookPen,
  Receipt,
  Truck,
  Users,
} from "lucide-react"
import { DatePickerInputController, SelectInputController } from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { CompanyRow } from "@/demo/playground/adminRows"
import { CompanySummary, companyNothingYet } from "@/demo/playground/CompanySummary"
import {
  COMPANIES_ID,
  COMPANY_STATUSES,
  USERS_ID,
  type Company,
} from "@/demo/playground/adminData"
import { FULL_WIDTH, POPUP } from "@/demo/playground/shared"

/**
 * The accounts the roastery supplies: the cafés, hotels and offices its
 * wholesale side lives on.
 *
 * This is the resource to open to see what a sub-view is for. A company is five
 * fields and the people who sign in for it, and that collection makes no sense
 * anywhere but under the company itself. So the edit view keeps the page rather
 * than a dialog: the form first, the tab underneath.
 */
export const companiesResource = createViewResource<Company>(COMPANIES_ID, {
  name: "Companies",
  icon: Building2,
  storage: "local",
  description:
    "The accounts the roastery supplies. Open one: its team is laid out under the form.",
  form: {
    inputs: {
      name: { label: "Name", required: true },
      city: { label: "City" },
      siret: { label: "SIRET" },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: COMPANY_STATUSES,
      },
      signedAt: { label: "Account opened", controller: DatePickerInputController },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          name: { label: "Search a company" },
          city: { label: "City" },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: COMPANY_STATUSES,
          },
        },
      },
      layouts: [
        layout.table(),
        layout.cards({
          columns: 3,
          components: { row: CompanyRow },
          // 0.x drew this row unframed: drop `frame` if it draws no card of its own.
          frame: false,
        }),
      ],
    },
    create: { title: "New company", ...POPUP },
    // On a page, not over the list: a dialog has room for the five fields and
    // none for what hangs off them. Each tab is a full view context of its own
    // — it fetches, filters, paginates and writes — and the open one is a
    // segment of the URL, so `/update/1/team` lands right back here.
    update: {
      title: "Edit a company",
      // The whole page, tabs included: the summary, the tab bar and the team's
      // table sit side by side, and the column every other form keeps leaves
      // them cramped. Declared on the action, so the list stays in the column.
      ...FULL_WIDTH,
      // The summary down the left and the default, scrolling bar beside it —
      // with more tabs than there is room for, so the bar has to scroll within
      // its column rather than push the page wider (posts has the column with
      // a vertical menu, users the bar with no column).
      tabs: {
        aside: CompanySummary,
        items: [
          {
            id: "team",
            label: "Team",
            icon: Users,
            description: "The accounts that sign in for this company.",
            resource: USERS_ID,
            // Filtering alone would give a list of this company's people whose
            // create button makes an account belonging to nobody: `defaultData`
            // is what makes "new user" mean "new user *here*".
            filter: ({ item }) => ({ company: (item as Company | undefined)?.name }),
            defaultData: ({ item }) => ({
              company: (item as Company | undefined)?.name,
            }),
          },
          {
            id: "deliveries",
            label: "Delivery schedule",
            icon: Truck,
            component: companyNothingYet("delivery"),
          },
          {
            id: "invoices",
            label: "Invoices and payments",
            icon: Receipt,
            component: companyNothingYet("invoice"),
          },
          {
            id: "agreements",
            label: "Price agreements",
            icon: Handshake,
            component: companyNothingYet("price agreement"),
          },
          {
            id: "equipment",
            label: "Equipment on loan",
            icon: Coffee,
            component: companyNothingYet("equipment on loan"),
          },
          {
            id: "contracts",
            label: "Contracts",
            icon: FileText,
            component: companyNothingYet("contract"),
          },
          {
            id: "requests",
            label: "Contact requests",
            icon: Inbox,
            component: companyNothingYet("contact request"),
          },
          {
            id: "notes",
            label: "Notes",
            icon: NotebookPen,
            component: companyNothingYet("note"),
          },
        ],
      },
    },
    delete: { title: "Delete a company", ...POPUP },
  },
})
