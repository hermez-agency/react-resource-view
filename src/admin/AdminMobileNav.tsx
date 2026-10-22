import { ReactNode, useState } from "react"
import { Ellipsis } from "lucide-react"
import { Trans } from "react-mini-i18n"
import { useNavigate } from "@/ports"
import { useScopeContext } from "@/scope/Scope"
import { MenuItemInterface } from "@/menu/menu"
import { useIsActiveMenuEntry } from "@/admin/useIsActiveMenuEntry"
import { externalLinkProps, isExternalHref } from "@/internal/url/externalLink"
import { Button, buttonVariants } from "@/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/ui/drawer"
import { cn } from "@/ui/cn"

export interface AdminMobileNavProps {
  /** The sidebar's footer block, shown at the bottom of the "more" drawer. */
  footer?: ReactNode
  /** The sidebar's footer links, listed in the "more" drawer. */
  footerMenu?: MenuItemInterface[]
  /** Names the "more" entry and its drawer — "More" when absent. */
  footerMenuTitle?: string
}

const ENTRY =
  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-3"
const LABEL = "fc max-w-full shrink-0 truncate text-xs"

/**
 * Bottom navigation bar for narrow screens, where a permanent sidebar would
 * take too much of the viewport. A top-level entry with children opens a
 * drawer listing them instead of a nested menu; what the sidebar pins at its
 * bottom goes behind a last "more" entry, in a drawer of its own.
 */
export function AdminMobileNav({
  footer,
  footerMenu,
  footerMenuTitle,
}: AdminMobileNavProps) {
  const scope = useScopeContext()?.scope
  const isActive = useIsActiveMenuEntry()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState<MenuItemInterface | null>(null)
  const [footerOpen, setFooterOpen] = useState(false)

  const items = (scope?.menu ?? []).filter((item) => !item.hidden)
  const footerItems = (footerMenu ?? []).filter((item) => !item.hidden)
  const hasFooter = footerItems.length > 0 || !!footer
  if (items.length === 0 && !hasFooter) return null

  const moreLabel = footerMenuTitle ?? <Trans>More</Trans>

  const handleItemClick = (item: MenuItemInterface) => {
    const children = item.items?.filter((subItem) => !subItem.hidden) ?? []

    if (children.length > 0 && !item.subNavigation) {
      setOpenGroup(item)
      return
    }

    void navigate({ to: item.href ?? children[0]?.href ?? "/" })
  }

  return (
    <nav
      data-slot="admin-mobile-nav"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur"
    >
      {/* The entries share the width of the screen rather than lining up from
          the left at the width of their names: four of them left the right
          end of a phone empty, and six ran past its edge in a row that
          scrolled without saying so. A name too long for its share is cut. */}
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item) || (item.items?.some(isActive) ?? false)

          return (
            <Button
              key={item.name}
              variant="ghost"
              onClick={() => handleItemClick(item)}
              aria-current={active ? "page" : undefined}
              className={cn(ENTRY, active ? "text-primary" : "text-foreground")}
            >
              {Icon && <Icon className="size-5" />}
              <span className={LABEL}>{item.name}</span>
            </Button>
          )
        })}
        {hasFooter && (
          <Button
            variant="ghost"
            onClick={() => setFooterOpen(true)}
            className={cn(ENTRY, "text-foreground")}
          >
            <Ellipsis className="size-5" />
            <span className={LABEL}>{moreLabel}</span>
          </Button>
        )}
      </div>

      <Drawer
        open={!!openGroup}
        onOpenChange={(open) => !open && setOpenGroup(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              {openGroup?.icon && <openGroup.icon className="size-5" />}
              {openGroup?.name}
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-3 overflow-y-auto p-4 pt-0">
            {openGroup?.items
              ?.filter((subItem) => !subItem.hidden)
              .map((subItem) => {
                const SubIcon = subItem.icon

                return (
                  <Button
                    key={subItem.name}
                    variant={isActive(subItem) ? "default" : "outline"}
                    onClick={() => {
                      setOpenGroup(null)
                      handleItemClick(subItem)
                    }}
                  >
                    {SubIcon && <SubIcon className="size-5 shrink-0" />}
                    <span className="fc font-medium">{subItem.name}</span>
                  </Button>
                )
              })}
          </div>
        </DrawerContent>
      </Drawer>

      {hasFooter && (
        <Drawer open={footerOpen} onOpenChange={setFooterOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{moreLabel}</DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-3 overflow-y-auto p-4 pt-0">
              {footerItems.map((item) => {
                const Icon = item.icon
                const content = (
                  <>
                    {Icon && <Icon className="size-5 shrink-0" />}
                    <span className="fc font-medium">{item.name}</span>
                  </>
                )

                return isExternalHref(item.href) ? (
                  <a
                    key={item.name}
                    {...externalLinkProps(item.href!)}
                    className={buttonVariants({ variant: "outline" })}
                    onClick={() => setFooterOpen(false)}
                  >
                    {content}
                  </a>
                ) : (
                  <Button
                    key={item.name}
                    variant={isActive(item) ? "default" : "outline"}
                    onClick={() => {
                      setFooterOpen(false)
                      handleItemClick(item)
                    }}
                  >
                    {content}
                  </Button>
                )
              })}
              {footer}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </nav>
  )
}
