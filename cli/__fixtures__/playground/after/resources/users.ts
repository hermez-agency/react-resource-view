import { Activity, FileUser, ScrollText, Users } from "lucide-react"
import {
  DatePickerInputController,
  EmailInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { UserRow } from "@/demo/playground/adminRows"
import {
  POSTS_ID,
  USER_ROLES,
  USER_STATUSES,
  USERS_ID,
  type User,
} from "@/demo/playground/adminData"
import { DRAWER, POPUP } from "@/demo/playground/shared"
import { UserActivity } from "@/demo/playground/UserActivity"
import { UserHeader, UserPage } from "@/demo/playground/UserHeader"
import { UserResume } from "@/demo/playground/UserResume"
import { UserSummary } from "@/demo/playground/UserSummary"

/**
 * The people who can sign in. This file is the whole screen: the table and its
 * columns, the card grid, the filter bar, the create dialog, the account page
 * with the posts written under it and the CV it amounts to, the edit drawer and
 * the delete confirmation all come out of the declaration below.
 */
export const usersResource = createViewResource<User>(USERS_ID, {
  name: "Users",
  // Read by `createItemMenuWithResource`, so the sidebar `AdminLayout` draws is
  // built from the resources themselves rather than written a second time.
  icon: Users,
  storage: "local",
  description: "Everyone who can sign in to the back office.",
  // One description drives three screens: the table's columns, the create
  // form and the edit form.
  form: {
    inputs: {
      name: { label: "Name", required: true },
      email: {
        label: "E-mail",
        required: true,
        controller: EmailInputController,
      },
      // The account the person signs in for, left empty for the roastery's
      // own staff. It is a field of the form rather than a hidden column
      // because a sub-view's `defaultData` fills in the form: creating a user
      // from a company's page shows the company it will belong to.
      company: { label: "Company" },
      role: {
        label: "Role",
        controller: SelectInputController,
        valueOptions: USER_ROLES,
      },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: USER_STATUSES,
      },
      signedUpAt: { label: "Joined on", controller: DatePickerInputController },
    },
  },
  views: {
    list: {
      // Read is not among the actions a row offers by default — [update, delete]
      // is — and the account's page lives in `read` below: without it here, a
      // row's only way in is the edit drawer, and the page is reached by nobody.
      rowActions: ["read", "update", "delete"],
      filters: {
        inputs: {
          name: { label: "Search a name" },
          company: { label: "Company" },
          role: {
            label: "Role",
            controller: SelectInputController,
            valueOptions: USER_ROLES,
          },
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: USER_STATUSES,
          },
        },
      },
      layouts: [
        layout.table(),
        layout.cards({
          columns: 3,
          components: { row: UserRow },
          // 0.x drew this row unframed: drop `frame` if it draws no card of its own.
          frame: false,
        }),
      ],
    },
    create: { title: "New user", ...POPUP },
    // An account opens on a page of its own, not on its form: a card saying
    // who it is, a column of figures, and the collections belonging to it laid
    // out as tabs — the form is one click away, in the drawer of the update
    // view below. A company does it the other way round, form first; an
    // account is looked at far more often than it is edited.
    read: {
      title: "User",
      components: {
        // The page's header, in place of the one `AdminLayout` draws: the card
        // names the account, so the default header would have been a second
        // title above it.
        navigation: UserHeader,
        view: UserPage,
      },
      tabs: {
        // Beside the tabs on a desktop, above them on a phone.
        aside: UserSummary,
        items: [
          {
            id: "posts",
            label: "Posts",
            icon: ScrollText,
            description: "Everything published under this name.",
            resource: POSTS_ID,
            // The nested list is filtered by the account on screen, and its
            // create button writes the same author — a post started from here
            // belongs to this person rather than to nobody.
            filter: ({ item }) => ({ author: (item as User | undefined)?.name }),
            defaultData: ({ item }) => ({
              author: (item as User | undefined)?.name,
            }),
          },
          {
            // The CV of this person — one account, one CV, so it is a field of
            // the user and not a collection beside it. A tab with a component
            // of its own rather than a nested resource: `UserResume` mounts the
            // page builder on the account on screen, and writes the blocks
            // back through this very resource.
            id: "cv",
            label: "Curriculum vitæ",
            icon: FileUser,
            description: "What this account amounts to on paper, block by block.",
            component: UserResume,
          },
          {
            // A tab with no resource behind it: a component of one's own.
            id: "activity",
            label: "Activity",
            icon: Activity,
            description: "What this account adds up to.",
            component: UserActivity,
          },
        ],
      },
    },
    // Six fields: a drawer over the account's page, or over the list, rather
    // than a page of their own. `admin_users/update/1` still opens the form on
    // its own, for a link that names it.
    update: { title: "Edit a user", ...DRAWER },
    delete: { title: "Delete a user", ...POPUP },
  },
})
