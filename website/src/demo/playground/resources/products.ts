import { Archive, Package } from "lucide-react"
import {
  NumberInputController,
  PriceInputController,
  SelectInputController,
} from "react-data-form"
import { createViewResource, layout } from "react-resource-view"
import { ProductRow } from "@/demo/playground/adminRows"
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCTS_ID,
  type Product,
} from "@/demo/playground/adminData"
import { POPUP } from "@/demo/playground/shared"

/** The catalogue. Edit a price straight in the table: every cell is a field. */
export const productsResource = createViewResource<Product>(PRODUCTS_ID, {
  name: "Products",
  icon: Package,
  storage: "local",
  description:
    "The catalogue, its prices and what is left in the warehouse. Check a few rows to archive or delete them together — no board needed.",
  form: {
    inputs: {
      name: { label: "Name", required: true },
      sku: { label: "SKU" },
      category: {
        label: "Category",
        controller: SelectInputController,
        valueOptions: PRODUCT_CATEGORIES,
      },
      // Prices are held in cents, which is what this controller reads and
      // writes — the display, the separator and the currency are the form
      // ports' business.
      price: { label: "Price", controller: PriceInputController },
      stock: { label: "Stock", controller: NumberInputController },
      status: {
        label: "Status",
        controller: SelectInputController,
        valueOptions: PRODUCT_STATUSES,
      },
    },
  },
  views: {
    list: {
      filters: {
        inputs: {
          name: { label: "Search a product" },
          category: {
            label: "Category",
            controller: SelectInputController,
            valueOptions: PRODUCT_CATEGORIES,
          },
        },
      },
      // No board here, and the selection works all the same: declaring bulk
      // actions is what puts a checkbox on each row, on each card, and
      // "Select all" in the table's header. "delete" is the deletion the
      // library already knows how to do — a confirmation, then one call per
      // product, as far as `permissions.delete` allows.
      bulkActions: [
        {
          label: "Archive",
          icon: Archive,
          onAction: (products: Product[], mutation) =>
            Promise.all(
              products.map((product) =>
                mutation.update({
                  "@id": product["@id"],
                  id: product.id,
                  status: "archived",
                })
              )
            ),
        },
        "delete",
      ],
      layouts: [
        layout.table(),
        layout.cards({ columns: 3, components: { row: ProductRow } }),
      ],
    },
    create: { title: "New product", ...POPUP },
    update: { title: "Edit a product", ...POPUP },
    delete: { title: "Delete a product", ...POPUP },
  },
})
