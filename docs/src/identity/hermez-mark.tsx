import type { SVGProps } from "react"

/**
 * Le symbole Hermez, variante 4D « contour » : un h et son point dans un carré
 * arrondi bordé d'orange. Même tracé que `hermez/hermez-symbol.svg`.
 */
export function HermezMark({
  dark = false,
  ...props
}: { dark?: boolean } & SVGProps<SVGSVGElement>) {
  const accent = dark ? "var(--hermez-orange-on-dark)" : "var(--hermez-orange)"
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="26"
        fill={dark ? "var(--hermez-dark)" : "#ffffff"}
        stroke="var(--hermez-orange)"
        strokeWidth="8"
      />
      <path
        d="M36 28V90M36 64C36 52 44 46 54 46C64 46 72 52 72 64V90"
        fill="none"
        stroke={accent}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="87" cy="33" r="7" fill={accent} />
    </svg>
  )
}
