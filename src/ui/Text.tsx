import { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/ui/cn"

const textVariants = /* @__PURE__ */ cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground",
      h2: "scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight first:mt-0",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight first:mt-0",
      p: "leading-7 not-first:mt-6",
      normal: "leading-4 2xl:leading-7 text-xs 2xl:text-sm",
      caption: "text-caption tracking-widest leading-normal",
      small: "text-sm leading-none font-medium",
      large: "text-lg font-semibold",
      lead: "text-muted-foreground text-xl",
      muted: "text-muted-foreground text-sm",
      blockquote: "mt-6 border-l-2 pl-6 italic",
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

export type TextVariant = NonNullable<VariantProps<typeof textVariants>["variant"]>

/** Default HTML tag rendered for each variant; override it with `as`. */
const variantElements = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  p: "p",
  normal: "p",
  caption: "span",
  small: "small",
  large: "p",
  lead: "p",
  muted: "span",
  blockquote: "blockquote",
} as const satisfies Record<TextVariant, string>

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  children: ReactNode
  variant?: TextVariant
  /** Forces the rendered HTML tag, otherwise inferred from the variant. */
  as?: React.ElementType
}

export function Text({
  children,
  variant = "p",
  as,
  className,
  ...props
}: TextProps) {
  const Component = as ?? variantElements[variant]

  return (
    <Component className={cn(textVariants({ variant }), className)} {...props}>
      {children}
    </Component>
  )
}

export { textVariants }
