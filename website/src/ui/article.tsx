import * as React from "react"
import { Info } from "lucide-react"

import { cn } from "@/lib/cn"

/*
 * Les briques d'un article de blog Hermez. Le texte courant tient sur une
 * colonne de lecture (68 caractères) ; les figures larges en sortent. Les
 * éléments bruts — h2, h3, p, listes, citations, code, tableaux — sont mis en
 * forme par `Article` lui-même, si bien qu'un HTML issu de Markdown s'y lit tel
 * quel.
 */

const prose = [
  // La colonne de lecture, et les éléments larges qui en débordent.
  "grid grid-cols-[1fr_min(68ch,100%)_1fr] px-5 sm:px-8",
  "[&>*]:col-start-2 [&>[data-width=wide]]:col-span-full [&>[data-width=wide]]:mx-auto [&>[data-width=wide]]:w-full [&>[data-width=wide]]:max-w-5xl",
  // Texte courant.
  "text-base leading-7 text-foreground sm:text-lg sm:leading-8",
  "[&>p]:mt-6 [&>p]:text-pretty",
  "[&_strong]:font-semibold",
  "[&_:is(p,li,td)>a]:font-medium [&_:is(p,li,td)>a]:text-primary [&_:is(p,li,td)>a]:underline [&_:is(p,li,td)>a]:decoration-primary/40 [&_:is(p,li,td)>a]:underline-offset-4 [&_:is(p,li,td)>a]:transition-colors hover:[&_:is(p,li,td)>a]:decoration-primary",
  // Titres.
  "[&>h2]:mt-16 [&>h2]:text-2xl [&>h2]:leading-tight [&>h2]:text-balance sm:[&>h2]:text-3xl",
  "[&>h3]:mt-10 [&>h3]:text-xl [&>h3]:leading-snug",
  "[&>h2+p]:mt-4 [&>h3+p]:mt-3",
  // Listes.
  "[&>ul]:mt-6 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-6 [&>ol]:mt-6 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-6",
  "[&_li]:pl-1 [&_li::marker]:text-muted-foreground [&_ol>li::marker]:font-mono [&_ol>li::marker]:text-sm",
  // Code.
  "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.875em]",
  "[&>pre]:mt-6 [&>pre]:overflow-x-auto [&>pre]:rounded-xl [&>pre]:border [&>pre]:border-border [&>pre]:bg-muted/60 [&>pre]:p-4 [&>pre]:font-mono [&>pre]:text-sm [&>pre]:leading-relaxed",
  // Tableaux.
  "[&>table]:mt-8 [&>table]:w-full [&>table]:text-left [&>table]:text-sm sm:[&>table]:text-base",
  "[&_th]:border-b [&_th]:border-border [&_th]:pb-2 [&_th]:font-medium [&_th]:text-muted-foreground",
  "[&_td>code]:whitespace-nowrap [&_td]:border-b [&_td]:border-border [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top",
  // Séparateur.
  "[&>hr]:mx-auto [&>hr]:mt-16 [&>hr]:w-24 [&>hr]:border-border",
].join(" ")

/** Le corps d'un article : la colonne de lecture et la mise en forme du texte. */
function Article({ className, ...props }: React.ComponentProps<"article">) {
  return <article data-slot="article" className={cn(prose, "pb-16", className)} {...props} />
}

/** La date d'un article, en toutes lettres. */
function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(date)
  )
}

/**
 * L'en-tête : le produit dont parle l'article, le titre, le chapeau, puis la
 * signature (toujours l'agence, jamais une personne), la date et la durée.
 */
function ArticleHeader({
  product,
  icon,
  category,
  title,
  lead,
  date,
  minutes,
  className,
}: {
  product: string
  icon?: string
  category?: string
  title: string
  lead?: React.ReactNode
  date: string
  minutes: number
  className?: string
}) {
  return (
    <header data-slot="article-header" className={cn("pt-12 sm:pt-16", className)}>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon && <img src={icon} alt="" className="size-5 rounded-md" />}
        <span className="font-medium text-foreground">{product}</span>
        {category && (
          <>
            <span aria-hidden>·</span>
            <span>{category}</span>
          </>
        )}
      </p>
      <h1 className="mt-4 text-3xl leading-tight text-balance sm:text-5xl sm:leading-[1.1]">{title}</h1>
      {lead && (
        <p className="mt-5 text-lg leading-8 text-pretty text-muted-foreground sm:text-xl sm:leading-8">
          {lead}
        </p>
      )}
      <p className="mt-6 flex flex-wrap items-center gap-x-2 border-t border-border pt-4 text-sm text-muted-foreground tabular-nums">
        <span className="text-foreground">Hermez</span>
        <span aria-hidden>·</span>
        <time dateTime={date}>{formatDate(date)}</time>
        <span aria-hidden>·</span>
        <span>{minutes} min de lecture</span>
      </p>
    </header>
  )
}

/**
 * Une image ou une illustration et sa légende. `wide` la fait sortir de la
 * colonne de lecture : pour la couverture, une capture, un schéma.
 */
function ArticleFigure({
  src,
  alt,
  caption,
  wide = false,
  children,
  className,
}: {
  src?: string
  alt?: string
  caption?: React.ReactNode
  wide?: boolean
  children?: React.ReactNode
  className?: string
}) {
  return (
    <figure data-slot="article-figure" data-width={wide ? "wide" : undefined} className={cn("mt-10", className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {src ? <img src={src} alt={alt ?? ""} className="block h-auto w-full" loading="lazy" /> : children}
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm leading-6 text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/** Une phrase mise en avant, en police de titre. Pas d'italique. */
function ArticleQuote({ children, cite, className }: { children: React.ReactNode; cite?: string; className?: string }) {
  return (
    <blockquote
      data-slot="article-quote"
      className={cn("mt-10 border-l-2 border-primary pl-6", className)}
    >
      <p className="font-heading text-xl leading-snug font-medium tracking-tight text-balance sm:text-2xl">
        {children}
      </p>
      {cite && <footer className="mt-3 text-sm text-muted-foreground">{cite}</footer>}
    </blockquote>
  )
}

/** Un encadré : une précision qui ne doit pas couper le fil du texte. */
function ArticleNote({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <aside
      data-slot="article-note"
      className={cn("mt-8 flex gap-3 rounded-xl border border-border bg-muted/50 p-4 text-base leading-7", className)}
    >
      <Info className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </div>
    </aside>
  )
}

/** La signature en pied d'article. */
function ArticleFooter({ tags = [], className }: { tags?: string[]; className?: string }) {
  return (
    <footer data-slot="article-footer" className={cn("mt-16 flex flex-wrap items-center gap-2 border-t border-border pt-6", className)}>
      {tags.map((tag) => (
        <span key={tag} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground">
          {tag}
        </span>
      ))}
      <span className="ml-auto text-sm text-muted-foreground">Un produit Hermez</span>
    </footer>
  )
}

/** Un article dans une liste : la page d'accueil du blog, « À lire aussi ». */
function ArticleCard({
  href,
  image,
  product,
  title,
  date,
  minutes,
  className,
}: {
  href: string
  image: string
  product: string
  title: string
  date: string
  minutes: number
  className?: string
}) {
  return (
    <a
      href={href}
      data-slot="article-card"
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        className
      )}
    >
      <img src={image} alt="" className="aspect-[32/15] w-full border-b border-border object-cover" loading="lazy" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm text-muted-foreground">{product}</p>
        <p className="font-heading text-lg leading-snug font-semibold tracking-tight text-foreground text-balance group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="mt-auto pt-2 text-sm text-muted-foreground tabular-nums">
          <time dateTime={date}>{formatDate(date)}</time> · {minutes} min
        </p>
      </div>
    </a>
  )
}

export { Article, ArticleCard, ArticleFigure, ArticleFooter, ArticleHeader, ArticleNote, ArticleQuote }
