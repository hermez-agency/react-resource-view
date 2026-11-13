import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Header } from "@/components/Header"

export const Route = createFileRoute("/blog")({
  component: BlogLayout,
})

/** The shell shared by the blog's pages: the site header, then the page. */
function BlogLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
