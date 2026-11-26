import { seedAdminData } from "@/demo/playground/adminData"

/**
 * The resources of the playground's back office, one file each.
 *
 * They are declared in modules rather than in a page because
 * `createViewResource` writes into the shared resource registry — declaring
 * the same IRI twice would register it twice. Only the scope and the builder
 * import them, and the playground loads the scope lazily: a reader who never
 * opens the administration never downloads any of this.
 *
 * Importing this module is what opens the back office, and a view fetches as
 * soon as it mounts — so this is the last moment the fixtures can be written.
 * The builder screen goes through here too: it saves into these resources, and
 * a reader who lands on it first is just as much a first visit.
 */
seedAdminData()

export { activityResource } from "@/demo/playground/resources/activity"
export { commentsResource } from "@/demo/playground/resources/comments"
export { companiesResource } from "@/demo/playground/resources/companies"
export { newslettersResource } from "@/demo/playground/resources/newsletters"
export { ordersResource } from "@/demo/playground/resources/orders"
export { overviewResource } from "@/demo/playground/resources/overview"
export { postsResource } from "@/demo/playground/resources/posts"
export { productsResource } from "@/demo/playground/resources/products"
export { tasksResource } from "@/demo/playground/resources/tasks"
export { usersResource } from "@/demo/playground/resources/users"
