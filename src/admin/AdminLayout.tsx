import { FC, PropsWithChildren, ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/ui/sidebar"
import { AdminSidebarNav } from "@/admin/AdminSidebarNav"
import { AdminTopBar } from "@/admin/AdminTopBar"
import { AdminHeader } from "@/admin/AdminHeader"
import { AdminMobileNav } from "@/admin/AdminMobileNav"
import { useIsMobile } from "@/internal/browser/useIsMobile"
import useCurrentViewResourceContext from "@/provider/useCurrentViewResourceContext"
import { isFullWidthView } from "@/utils/isFullWidthView"
import { cn } from "@/ui/cn"
import { MenuItemInterface } from "@/menu/menu"

export interface AdminLayoutProps extends PropsWithChildren {
  /** Rendered in the sidebar header on desktop, and in the top bar on mobile. */
  logo?: ReactNode
  /** Rendered at the end of the top bar — a search field, a user menu... */
  topBarEnd?: ReactNode
  /**
   * Pinned at the bottom of the sidebar — a help block, a plan badge... On
   * mobile, shown in the drawer of the last "more" entry of the bottom bar.
   */
  sidebarFooter?: ReactNode
  /**
   * Links pinned at the bottom of the sidebar, styled like the scope's `menu`
   * — help centre, support, documentation. An absolute `href` leaves the
   * application: a web page opens in a new tab. On mobile, listed in the
   * drawer of the last "more" entry of the bottom bar.
   */
  footerMenu?: MenuItemInterface[]
  /** Heading above `footerMenu` — "Need help?"; names the "more" entry on mobile. */
  footerMenuTitle?: string
  /**
   * On mobile, how many of the scope's menu entries the bottom bar shows (4 by
   * default); the following ones go in the "more" drawer, ahead of `footerMenu`.
   */
  mobileNavMaxItems?: number
}

/**
 * Ready-made admin template: a collapsible sidebar built from the current
 * scope's `menu`, a top bar, a page header with sub-navigation tabs, and a
 * bottom navigation bar on narrow screens instead of the sidebar.
 *
 * Used as is, it needs nothing beyond a scope's `menu` and
 * `defaultViewResourceContextParams`:
 *
 * ```ts
 * const adminScope: ScopeInterface = {
 *   name: "admin",
 *   decoratorComponent: AdminLayout,
 *   menu: [createItemMenuWithResource({ resource: articlesResource })],
 * }
 * ```
 *
 * To add a logo, actions in the top bar or a block at the bottom of the
 * sidebar, use {@link createAdminLayout} instead of passing this component
 * directly.
 *
 * Views are drawn in a column of constrained width; a view declaring
 * `fullWidth` — a board, a calendar — takes the whole page instead, keeping
 * the side margins.
 */
export function AdminLayout({
  children,
  logo,
  topBarEnd,
  sidebarFooter,
  footerMenu,
  footerMenuTitle,
  mobileNavMaxItems,
}: AdminLayoutProps) {
  const isMobile = useIsMobile()
  const fullWidth = isFullWidthView(useCurrentViewResourceContext())

  return (
    <SidebarProvider>
      {!isMobile && (
        <AdminSidebarNav
          logo={logo}
          footer={sidebarFooter}
          footerMenu={footerMenu}
          footerMenuTitle={footerMenuTitle}
        />
      )}
      <SidebarInset className="bg-muted/30">
        <AdminTopBar logo={logo} end={topBarEnd} />
        <div
          data-slot="admin-content"
          data-full-width={fullWidth || undefined}
          className={cn(
            "mx-auto flex w-full flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8",
            !fullWidth && "max-w-6xl",
            isMobile && "pb-24"
          )}
        >
          <AdminHeader />
          {children}
        </div>
      </SidebarInset>
      {isMobile && (
        <AdminMobileNav
          footer={sidebarFooter}
          footerMenu={footerMenu}
          footerMenuTitle={footerMenuTitle}
          mobileNavMaxItems={mobileNavMaxItems}
        />
      )}
    </SidebarProvider>
  )
}

/**
 * Builds a `decoratorComponent` for a scope, with a logo, top bar content
 * and/or a sidebar footer baked in — `AdminLayout` itself takes no props when used directly
 * as `decoratorComponent`, since that slot only ever receives `children`.
 *
 * ```ts
 * decoratorComponent: createAdminLayout({ logo: <MyLogo />, topBarEnd: <UserMenu /> })
 * ```
 */
export function createAdminLayout(
  options: Omit<AdminLayoutProps, "children">
): FC<PropsWithChildren> {
  return function ConfiguredAdminLayout({ children }) {
    return <AdminLayout {...options}>{children}</AdminLayout>
  }
}
