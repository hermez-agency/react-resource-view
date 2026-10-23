import { configurePorts } from "react-resource-view"
import { tanstackAdapter } from "react-resource-view/tanstack"

/**
 * Wires react-resource-view into this application, once, before anything
 * renders: the router it navigates with. There is no `configureApi` — the
 * resources store their rows in the browser (`storage: "local"`).
 */
configurePorts({
  navigation: tanstackAdapter,
  appName: "Starter",
  isDev: import.meta.env.DEV,
})
