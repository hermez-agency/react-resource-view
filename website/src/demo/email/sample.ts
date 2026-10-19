import type { EmailBlock, EmailBlockType, EmailEnvelope } from "./renderEmail"

/**
 * The newsletter the email builder opens on — October's, announcing a new roast.
 *
 * Plain data, and only type imports: the test-send script reads it from Node,
 * where neither the `@/` alias nor the form registry exists. Images are ids of
 * the media library (`public/email/<id>.png`), links are absolute.
 */

type Block = EmailBlock & { type: EmailBlockType }

/** Where the sample's links lead: the playground the newsletter came from. */
const SITE = "https://hermez.dev/react-resource-view"

export const SAMPLE_ENVELOPE: Required<EmailEnvelope> = {
  subject: "New roast: Sunrise, a washed Ethiopia",
  preheader:
    "Bright, floral, roasted on Tuesday — and two bags to pair it with this month.",
  fromName: "The Roastery",
  brandColor: "#7c2d12",
}

export const SAMPLE_BLOCKS: Block[] = [
  {
    id: "email-1",
    type: "email.header",
    order: 0,
    brand: "The Roastery",
    logo: "bean-light",
  },
  {
    id: "email-2",
    type: "email.hero",
    order: 1,
    image: "sunrise",
    title: "October's new roast",
    subtitle:
      "Sunrise is a washed Ethiopia from the Guji highlands: jasmine, bergamot and a finish like black tea.",
  },
  {
    id: "email-3",
    type: "email.text",
    order: 2,
    title: "Roasted on Tuesday, at your door on Thursday",
    body: "<p>We roasted the first batch this week, in lots of twelve kilos, and it goes out <strong>the day after it leaves the drum</strong>.</p><p>Brew it a little cooler than usual — around 92\u00a0°C — and it tastes like the <em>farm</em> rather than like the roaster.</p>",
  },
  {
    id: "email-4",
    type: "email.columns",
    order: 3,
    leftImage: "orchard",
    leftTitle: "Orchard, Colombia",
    leftText: "Red apple and panela. The everyday bag.",
    leftUrl: `${SITE}/playground/`,
    rightImage: "night",
    rightTitle: "Night, Sumatra",
    rightText: "Cedar, cocoa, a long dark finish.",
    rightUrl: `${SITE}/playground/`,
    action: "See the bag",
  },
  {
    id: "email-5",
    type: "email.button",
    order: 4,
    label: "Order Sunrise",
    url: `${SITE}/playground/builder/`,
    align: "center",
  },
  {
    id: "email-6",
    type: "email.footer",
    order: 5,
    address: "The Roastery · 12 rue des Torréfacteurs · 69002 Lyon, France",
    reason:
      "You are receiving this because you ordered from the Roastery or signed up on our site.",
    unsubscribeUrl: `${SITE}/playground/?unsubscribe=1`,
    unsubscribeLabel: "Unsubscribe",
  },
]
