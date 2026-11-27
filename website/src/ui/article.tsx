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

/** Les langues d'un article, et ce que ces briques écrivent dans chacune. */
type ArticleLang = "fr" | "en"

const LABELS: Record<ArticleLang, { locale: string; minutes: string; product: string }> = {
  fr: { locale: "fr-FR", minutes: "min de lecture", product: "Un produit Hermez" },
  en: { locale: "en-US", minutes: "min read", product: "A Hermez product" },
}

/** La date d'un article, en toutes lettres, dans sa langue. */
function formatDate(date: string, lang: ArticleLang = "fr") {
  return new Intl.DateTimeFormat(LABELS[lang].locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
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
  lang = "fr",
  translation,
  className,
}: {
  product: string
  icon?: string
  category?: string
  title: string
  lead?: React.ReactNode
  date: string
  minutes: number
  /** La langue de l'article : dates et libellés la suivent. */
  lang?: ArticleLang
  /** Le lien vers la version de l'article dans une autre langue. */
  translation?: { href: string; label: string; lang: ArticleLang }
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
        <time dateTime={date}>{formatDate(date, lang)}</time>
        <span aria-hidden>·</span>
        <span>
          {minutes} {LABELS[lang].minutes}
        </span>
        {translation && (
          <a
            href={translation.href}
            hrefLang={translation.lang}
            lang={translation.lang}
            rel="alternate"
            data-slot="article-translation"
            className="ml-auto font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
          >
            {translation.label}
          </a>
        )}
      </p>
    </header>
  )
}

interface CoverSource {
  type: string
  srcSet: string
}

/**
 * An illustration: its SVG inline when it has one, so it follows the theme,
 * else the image with its AVIF / WebP variants when it has some.
 */
function Picture({
  src,
  svg,
  sources,
  alt,
  sizes,
  className,
  eager = false,
}: {
  src: string
  svg?: string
  sources?: CoverSource[]
  alt: string
  sizes: string
  className?: string
  eager?: boolean
}) {
  if (svg) {
    // The SVG carries its own `aria-label`; `alt` is its twin in covers.json.
    return (
      <div
        data-slot="inline-illustration"
        className={cn("[&>svg]:block [&>svg]:h-full [&>svg]:w-full", className)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }
  const img = (
    <img
      src={src}
      alt={alt}
      width={1024}
      height={576}
      className={className}
      loading={eager ? undefined : "lazy"}
      decoding="async"
    />
  )
  if (!sources?.length) return img
  return (
    <picture>
      {sources.map((source) => (
        <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={sizes} />
      ))}
      {img}
    </picture>
  )
}

/**
 * Une image ou une illustration et sa légende. `wide` la fait sortir de la
 * colonne de lecture : pour la couverture, une capture, un schéma.
 */
function ArticleFigure({
  src,
  svg,
  sources,
  alt,
  caption,
  wide = false,
  children,
  className,
}: {
  src?: string
  /** The inline SVG of `src`, preferred over it when present. */
  svg?: string
  /** Lighter variants of `src`, tried in order by the browser. */
  sources?: CoverSource[]
  alt?: string
  caption?: React.ReactNode
  wide?: boolean
  children?: React.ReactNode
  className?: string
}) {
  return (
    <figure data-slot="article-figure" data-width={wide ? "wide" : undefined} className={cn("mt-10", className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {src ? (
          <Picture
            src={src}
            svg={svg}
            sources={sources}
            alt={alt ?? ""}
            sizes="(min-width: 1024px) 64rem, 100vw"
            className={svg ? "block aspect-video w-full" : "block h-auto w-full"}
            // The cover opens the page: it is the largest thing in view.
            eager
          />
        ) : (
          children
        )}
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
function ArticleFooter({
  tags = [],
  lang = "fr",
  className,
}: {
  tags?: string[]
  lang?: ArticleLang
  className?: string
}) {
  return (
    <footer data-slot="article-footer" className={cn("mt-16 flex flex-wrap items-center gap-2 border-t border-border pt-6", className)}>
      {tags.map((tag) => (
        <span key={tag} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground">
          {tag}
        </span>
      ))}
      <span className="ml-auto text-sm text-muted-foreground">{LABELS[lang].product}</span>
    </footer>
  )
}

/** Un article dans une liste : la page d'accueil du blog, « À lire aussi ». */
function ArticleCard({
  href,
  image,
  imageSvg,
  imageSources,
  imageAlt = "",
  product,
  title,
  date,
  minutes,
  lang = "fr",
  className,
}: {
  href: string
  image: string
  /** The inline SVG of `image`, preferred over it when present. */
  imageSvg?: string
  imageSources?: CoverSource[]
  /** Describes the illustration; empty when the image is only decorative. */
  imageAlt?: string
  product: string
  title: string
  date: string
  minutes: number
  lang?: ArticleLang
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
      <Picture
        src={image}
        svg={imageSvg}
        sources={imageSources}
        alt={imageAlt}
        sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
        className="aspect-[32/15] w-full border-b border-border object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm text-muted-foreground">{product}</p>
        <p className="font-heading text-lg leading-snug font-semibold tracking-tight text-foreground text-balance group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="mt-auto pt-2 text-sm text-muted-foreground tabular-nums">
          <time dateTime={date}>{formatDate(date, lang)}</time> · {minutes} min
        </p>
      </div>
    </a>
  )
}

export type { ArticleLang }
export { Article, ArticleCard, ArticleFigure, ArticleFooter, ArticleHeader, ArticleNote, ArticleQuote }
