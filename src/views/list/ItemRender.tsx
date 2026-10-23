import { FormInputInterface } from "react-data-form"
import { translate } from "react-mini-i18n"
import { isApiIri } from "jsonld-item"
import { resolveDialect } from "@/api/apiConfig"
import type { ApiDialectInterface } from "@/api/apiDialectInterface"
import { Badge } from "@/ui/badge"
import ApiUri from "@/components/ApiUri"
import JsonPrettyComponent from "@/ui/JsonPrettyComponent"
import { Text } from "@/ui/Text"
import { isImageDataUrl, isMediaFile, isMediaFileList } from "@/media/mediaFile"
import { MediaValue } from "@/media/MediaValue"

/**
 * Draws a value for reading. `resource` names whose dialect decides if a string
 * is a relation to dereference; without one, the configured dialect does.
 */
export default function ItemRender(
  value: FormInputInterface["value"],
  resource?: { dialect?: ApiDialectInterface } | null
) {
  if (typeof value === "boolean") {
    return translate(String(value))
  }

  // Only a JSON-LD API answers a relation with an IRI worth dereferencing.
  // Elsewhere a string that looks like a path is just a string.
  if (
    typeof value === "string" &&
    resolveDialect(resource).referencesAreIris &&
    isApiIri(value)
  )
    return (
      <Badge className={"capitalize-first whitespace-nowrap"}>
        <ApiUri iri={value} />
      </Badge>
    )

  // What the media inputs store: drawn as a thumbnail and a list of files,
  // rather than a page of base64.
  if (isImageDataUrl(value) || isMediaFile(value) || isMediaFileList(value))
    return <MediaValue value={value} compact />

  if (Array.isArray(value)) return value.join(", ")

  if (typeof value === "object") return <JsonPrettyComponent data={value} />

  return <Text variant="p">{value}</Text>
}
