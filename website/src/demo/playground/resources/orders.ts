import { Receipt } from "lucide-react"
import {
  DatePickerInputController,
  EmailInputController,
  FormInputController,
  PriceInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { OrderCustomerCell, OrderRow } from "@/demo/playground/adminRows"
import { ORDER_STATUSES, ORDERS_ID, type Order } from "@/demo/playground/adminData"
import { POPUP } from "@/demo/playground/shared"

/**
 * An order is placed by a customer and never deleted from the back office: it
 * can be read and its status moved on, nothing else. The permissions say so,
 * and the buttons follow.
 *
 * It is also the resource to open for the "Shown fields" menu, next to the
 * filters: uncheck a field and it leaves the table and the cards alike, and it
 * is still gone after a reload. The customer is a field with fields under it —
 * hide `customer` and the whole block goes, or only its e-mail.
 */
export const ordersResource = createViewResource<Order>(ORDERS_ID, {
  name: "Orders",
  icon: Receipt,
  storage: "local",
  permissions: { create: false, delete: false },
  description: "What the shop has sold, and where each parcel stands.",
  form: {
    inputs: {
      reference: { label: "Reference", required: true },
      // A sub-form: the order holds `customer: { name, email, city }`, and the
      // "Shown fields" menu lists each of the three under "Customer".
      customer: {
        label: "Customer",
        controller: FormInputController,
        form: {
          inputs: {
            name: { label: "Name" },
            email: { label: "E-mail", controller: EmailInputController },
            city: { label: "City" },
          },
        },
      },
      total: { label: "Total", controller: PriceInputController },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: ORDER_STATUSES,
      },
      placedAt: { label: "Placed on", controller: DatePickerInputController },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          status: {
            label: "Status",
            controller: SelectInputController,
            valueOptions: ORDER_STATUSES,
          },
        },
      },
      // The "Shown fields" menu is there by default; what is declared here is
      // where it starts. The customer's e-mail is hidden until the reader ticks
      // it, and what they tick is kept in `localStorage` — one choice for the
      // resource, shared by both layouts below.
      fields: {
        persist: "local",
        hidden: ["customer.email"],
      },
      layouts: [
        // The customer as three lines rather than the sub-form the edit dialog
        // keeps, each one following the menu.
        layout.table({
          form: { inputs: { customer: { controller: OrderCustomerCell } } },
        }),
        layout.cards({ columns: 3, components: { row: OrderRow } }),
      ],
    },
    update: { title: "Edit an order", ...POPUP },
  },
})
