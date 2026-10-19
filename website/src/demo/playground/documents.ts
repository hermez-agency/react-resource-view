import {
  PAGE_CTA,
  PAGE_GALLERY,
  PAGE_HERO,
  PAGE_QUOTE,
  PAGE_TEXT,
  RESUME_EDUCATION,
  RESUME_EXPERIENCE,
  RESUME_HEADER,
  RESUME_SKILLS,
  type BuilderBlock,
} from "@/demo/builder/blocks"
import type { Newsletter, Post } from "@/demo/playground/adminData"
import { SAMPLE_BLOCKS, SAMPLE_ENVELOPE } from "@/demo/email/sample"

/**
 * The records of the back office that are documents rather than fields: the
 * pages of the site, and the CV an account amounts to.
 *
 * Written the way the builder writes its own samples — see `BUILDER_KITS` in
 * `@/demo/builder/kits`: a block is an object whose `type` is the `@for` tag of
 * the form that draws it, and every picture is an id of the media library
 * rather than a URL, so the fixtures load with the page and survive offline.
 *
 * They exist because a page builder with nothing in it demonstrates nothing: a
 * list has no layouts to switch between, no filter to try and no record to
 * open. These are the same shape the builder saves, so a page published from
 * `/playground/builder` lands next to them and reads exactly alike.
 *
 * The types come from `adminData`, which reads these back in turn — only ever
 * as types, so nothing is imported in both directions at runtime.
 */

/**
 * The newsletters of the roastery: the one the email builder opens on, being
 * scheduled, the one before it, sent, and the next one, still a draft.
 *
 * Block ids are prefixed per newsletter — they only have to be unique inside
 * one message, but a reader comparing two payloads should not be misled.
 */
const SITE = "https://hermez.dev/react-resource-view"

function renumbered(prefix: string, blocks: BuilderBlock[]): BuilderBlock[] {
  return blocks.map((block, order) => ({ ...block, id: `${prefix}-${order + 1}`, order }))
}

const FOOTER = SAMPLE_BLOCKS.find((block) => block.type === "email.footer")!

export const NEWSLETTERS: Array<Omit<Newsletter, "@id" | "@type">> = [
  {
    id: "1",
    ...SAMPLE_ENVELOPE,
    status: "scheduled",
    sendAt: "2026-10-06",
    blocks: renumbered("oct", SAMPLE_BLOCKS),
  },
  {
    id: "2",
    subject: "Harvest notes from Huila",
    preheader: "Three weeks on a Colombian farm, and the lot we came back with.",
    fromName: "The Roastery",
    brandColor: "#14532d",
    status: "sent",
    sendAt: "2026-09-08",
    blocks: renumbered("sep", [
      { type: "email.header", brand: "The Roastery", logo: "bean-light" },
      {
        type: "email.hero",
        image: "orchard",
        title: "Harvest notes from Huila",
        subtitle: "Three weeks with the Muñoz family, and the twelve sacks we bought.",
      },
      {
        type: "email.text",
        body: "<p>The cherries are picked ripe, one pass every ten days, and dried on raised beds under the eaves. It is slow, and it is <strong>why the cup tastes of red apple</strong>.</p><ul><li>Variety: Caturra and Castillo</li><li>Altitude: 1,750 m</li><li>Process: washed</li></ul>",
      },
      { type: "email.separator", kind: "line", size: "medium" },
      {
        type: "email.image",
        image: "studio",
        caption: "The first roast of the lot, on our drum in Lyon.",
        url: `${SITE}/playground`,
      },
      {
        type: "email.button",
        label: "Read the whole story",
        url: `${SITE}/playground`,
        align: "center",
      },
      FOOTER,
    ]),
  },
  {
    id: "3",
    subject: "Gift boxes are back",
    preheader: "Three bags, a card in your own words, shipped on the day you pick.",
    fromName: "The Roastery",
    brandColor: "#581c87",
    status: "draft",
    sendAt: "",
    blocks: renumbered("nov", [
      { type: "email.header", brand: "The Roastery", logo: "bean-dark" },
      {
        type: "email.hero",
        image: "dusk",
        title: "Gift boxes are back",
        subtitle: "Three single origins and a card, wrapped in the roastery.",
      },
      {
        type: "email.button",
        label: "Build a box",
        url: `${SITE}/playground/builder`,
        align: "center",
      },
      FOOTER,
    ]),
  },
]

/**
 * The pages of the site, stored as posts.
 *
 * They are the same kind of record as an article — a title and a stack of
 * blocks — so they live in the same collection, under the "Pages" category.
 * Their ids continue the articles', which is what keeps two rows of one
 * collection from sharing an IRI.
 */
export const PAGES: Array<Omit<Post, "@id" | "@type">> = [
  {
    id: "8",
    title: "Coffee, from the farm to your kitchen",
    author: "Ada Lovelace",
    category: "Pages",
    status: "published",
    publishedAt: "2026-01-05",
    views: 5127,
    blocks: [
      {
        id: "home-1",
        type: PAGE_HERO,
        order: 0,
        eyebrow: "Roasted on Tuesdays",
        title: "Coffee, from the farm to your kitchen",
        subtitle:
          "Six single origins, roasted the day before they are shipped, and never blended into something they are not.",
        image: "sunrise",
        align: "center",
      },
      {
        id: "home-2",
        type: PAGE_TEXT,
        order: 1,
        title: "What we do",
        body: "<p>We buy green coffee from eleven farms, roast it in small batches, and ship it within twenty-four hours. <strong>No warehouse, no waiting.</strong></p>",
      },
      {
        id: "home-3",
        type: PAGE_GALLERY,
        order: 2,
        title: "The roastery",
        images: ["orchard", "studio", "harbour"],
        columns: "3",
      },
      {
        id: "home-4",
        type: PAGE_QUOTE,
        order: 3,
        quote: "The only order I have never had to chase.",
        author: "Inès Berthet",
        role: "Café Néon, Lyon",
      },
      {
        id: "home-5",
        type: PAGE_CTA,
        order: 4,
        title: "Pick your first bag",
        description: "Free shipping on the first order, and no subscription to cancel.",
        action: "Browse the roasts",
      },
    ],
  },
  {
    id: "9",
    title: "The subscription",
    author: "Grace Hopper",
    category: "Pages",
    status: "published",
    publishedAt: "2026-01-19",
    views: 2044,
    blocks: [
      {
        id: "sub-1",
        type: PAGE_HERO,
        order: 0,
        eyebrow: "Every other Thursday",
        title: "A bag, before you run out",
        subtitle:
          "Choose a weight and a rhythm; we roast the morning it leaves. Pause it, skip it or stop it from your account.",
        image: "harbour",
        align: "left",
      },
      {
        id: "sub-2",
        type: PAGE_TEXT,
        order: 1,
        title: "How it works",
        body: "<p>Pick 250 g or 1 kg, weekly or fortnightly. We alternate between the origins on the shelf that week — or pin the one you cannot do without.</p>",
      },
      {
        id: "sub-3",
        type: PAGE_QUOTE,
        order: 2,
        quote: "Three years in, and I have never opened a stale bag.",
        author: "Marc Oliveira",
        role: "Subscriber since 2023",
      },
      {
        id: "sub-4",
        type: PAGE_CTA,
        order: 3,
        title: "Start with a fortnight",
        description: "Cancel from the first delivery, no message to send anyone.",
        action: "Choose a rhythm",
      },
    ],
  },
  {
    id: "10",
    title: "Wholesale",
    author: "Barbara Liskov",
    category: "Pages",
    status: "published",
    publishedAt: "2026-02-11",
    views: 863,
    blocks: [
      {
        id: "pro-1",
        type: PAGE_HERO,
        order: 0,
        eyebrow: "Cafés, hotels, offices",
        title: "Coffee for a room full of people",
        subtitle:
          "A profile roasted for your machine, delivered on the day your week starts, invoiced once a month.",
        image: "studio",
        align: "left",
      },
      {
        id: "pro-2",
        type: PAGE_TEXT,
        order: 1,
        title: "What comes with it",
        body: "<p>A cupping before the first order, a training morning for your team, and a batch schedule you can read from your account.</p>",
      },
      {
        id: "pro-3",
        type: PAGE_GALLERY,
        order: 2,
        title: "On site",
        images: ["studio", "night"],
        columns: "2",
      },
      {
        id: "pro-4",
        type: PAGE_CTA,
        order: 3,
        title: "Ask for a cupping",
        description: "Twenty minutes, four origins, no order to place afterwards.",
        action: "Book a date",
      },
    ],
  },
  {
    id: "11",
    title: "Christmas boxes",
    author: "Katherine Johnson",
    category: "Pages",
    status: "draft",
    publishedAt: "",
    views: 0,
    blocks: [
      {
        id: "xmas-1",
        type: PAGE_HERO,
        order: 0,
        eyebrow: "Draft — reopens in November",
        title: "Three origins, one box",
        subtitle: "The three roasts of the season, packed the week they are picked.",
        image: "night",
        align: "center",
      },
      {
        id: "xmas-2",
        type: PAGE_TEXT,
        order: 1,
        title: "Still to write",
        body: "<p>Prices, the shipping cut-off and the picture of the box. Kept here so next December starts from something.</p>",
      },
    ],
  },
]

/**
 * The CVs, one per account.
 *
 * A user *is* a CV — that is the whole model — so these are keyed by the name
 * of the account they belong to and written straight onto it at seed time.
 * Three are written out here because a builder with nothing in it demonstrates
 * nothing; every other account opens on the starter below, which is a CV
 * begun rather than an empty screen.
 */
export const RESUMES: Record<string, BuilderBlock[]> = {
  "Camille Roux": [
    {
      id: "cv-1",
      type: RESUME_HEADER,
      order: 0,
      name: "Camille Roux",
      role: "Front-end engineer",
      portrait: "ink",
      summary:
        "Eight years building interfaces that stay maintainable once the team doubles. Partial to design systems and to deleting code.",
      contact: ["camille@example.com", "Lyon, France", "+33 6 00 00 00 00"],
    },
    {
      id: "cv-2",
      type: RESUME_EXPERIENCE,
      order: 1,
      role: "Lead front-end",
      company: "Néon",
      period: "2021 — today",
      description:
        "Rebuilt the back office around declarative resources: seven screens, seven files, and a release every week instead of every quarter.",
      stack: ["React", "TypeScript", "Tailwind"],
    },
    {
      id: "cv-3",
      type: RESUME_EXPERIENCE,
      order: 2,
      role: "Front-end developer",
      company: "Atelier Vert",
      period: "2018 — 2021",
      description: "Design system, then the six products that came to depend on it.",
      stack: ["React", "Storybook"],
    },
    {
      id: "cv-4",
      type: RESUME_EDUCATION,
      order: 3,
      degree: "MSc Computer Science",
      school: "Université Lyon 1",
      period: "2016",
    },
    {
      id: "cv-5",
      type: RESUME_SKILLS,
      order: 4,
      title: "Skills",
      skills: ["React", "TypeScript", "Accessibility", "Design systems", "Testing"],
    },
  ],
  "Ada Lovelace": [
    {
      id: "ada-1",
      type: RESUME_HEADER,
      order: 0,
      name: "Ada Lovelace",
      role: "Head of the roastery",
      portrait: "sand",
      summary:
        "Buys the green coffee, signs the accounts, and still roasts the Tuesday batch herself.",
      contact: ["ada@roastery.example", "Montpellier, France"],
    },
    {
      id: "ada-2",
      type: RESUME_EXPERIENCE,
      order: 1,
      role: "Founder",
      company: "The roastery",
      period: "2019 — today",
      description:
        "Eleven farms, two roasters and a wholesale side that outgrew the shop in its third year.",
      stack: ["Sourcing", "Cupping", "Wholesale"],
    },
    {
      id: "ada-3",
      type: RESUME_SKILLS,
      order: 2,
      title: "Skills",
      skills: ["Sourcing", "Cupping", "Roast profiling", "Teaching"],
    },
  ],
  "Grace Hopper": [
    {
      id: "grace-1",
      type: RESUME_HEADER,
      order: 0,
      name: "Grace Hopper",
      role: "Editor",
      portrait: "sage",
      summary:
        "Writes the guides, and keeps the brewing pages honest about what actually changes the cup.",
      contact: ["grace@roastery.example", "Lyon, France"],
    },
    {
      id: "grace-2",
      type: RESUME_EXPERIENCE,
      order: 1,
      role: "Editor",
      company: "The roastery",
      period: "2022 — today",
      description: "The blog, the newsletter, and the eleven guides people actually read.",
      stack: ["Writing", "Editing", "Photography"],
    },
  ],
}

/**
 * The CV of an account nobody has written one for yet: the identity block,
 * filled in from what the account already says about itself.
 *
 * Opening the tab on a blank builder is a small insult — the name, the role and
 * the address are known — so the document starts where the record ends.
 */
export function starterResume(user: {
  id: string
  name: string
  email: string
  company: string
  role: string
}): BuilderBlock[] {
  const ROLES: Record<string, string> = {
    admin: "Administrator",
    editor: "Editor",
    reader: "Reader",
  }

  return [
    {
      id: `starter-${user.id}`,
      type: RESUME_HEADER,
      order: 0,
      name: user.name,
      role: ROLES[user.role] ?? "",
      portrait: "plum",
      summary: "",
      contact: [user.email, user.company].filter(Boolean),
    },
  ]
}
