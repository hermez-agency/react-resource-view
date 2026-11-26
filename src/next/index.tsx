import { useEffect } from "react"
import NextLink from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { NavigationPortInterface } from "@/ports"

/**
 * Ready-made navigation adapter for the [Next.js](https://nextjs.org) App
 * Router. The Pages Router is not supported.
 *
 * ```ts
 * import { configurePorts } from "react-resource-view"
 * import { nextAdapter } from "react-resource-view/next"
 *
 * configurePorts({ navigation: nextAdapter })
 * ```
 *
 * Importing this entry point is what pulls Next.js in — the core of the
 * package never references it, so an application on another router installs
 * nothing extra. The views are client components: configure the ports from a
 * client module.
 */
export const nextAdapter: NavigationPortInterface = {
  useNavigate: () => {
    const router = useRouter()
    return ({ to, replace, resetScroll }) => {
      const options = { scroll: resetScroll !== false }
      if (replace) router.replace(to, options)
      else router.push(to, options)
    }
  },

  useLocation: () => {
    const pathname = usePathname()
    const params = useSearchParams()
    const query = params?.toString() ?? ""
    return {
      pathname: pathname ?? "/",
      searchStr: query ? `?${query}` : "",
      search: Object.fromEntries(params ?? []),
    }
  },

  Link: ({ to, children, ...rest }) => (
    <NextLink href={to} {...rest}>
      {children}
    </NextLink>
  ),

  Navigate: ({ to, replace }) => {
    const router = useRouter()
    useEffect(() => {
      if (replace) router.replace(to)
      else router.push(to)
    }, [router, to, replace])
    return null
  },

  // Next.js exposes no public "navigation pending" signal: the views fall back
  // to counting a navigation from a click on one of their links.
}
