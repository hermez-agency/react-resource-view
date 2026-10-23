import { FC, useEffect, useState } from "react"
import {
  fetchDataFromApiPlatform,
  getDataFromApiPlatform,
  removeDataFromApiPlatform,
} from "jsonld-api-client"
import { Link } from "@/ports"
import { generateLinkFromIri } from "@/routes/routes"
import { LittleLoader } from "@/ui/Loader"
import { BaseJsonLdItemInterface, JsonLDItem } from "jsonld-item"
import { Badge } from "@/ui/badge"
import { ActionList } from "react-data-form"

export interface ApiPlatformUriComponentPropsInterface {
  iri?: string | null
  goToResource?: boolean
  property?: string
  component?: FC<{ data: JsonLDItem<any> }>
  scope?: string
  resourceAction?: ActionList
  noCache?: boolean
}

export default function ApiUri({
  iri,
  goToResource,
  property,
  component,
  resourceAction,
  scope,
  noCache,
}: ApiPlatformUriComponentPropsInterface) {
  const currentProperty = property ?? "name"
  const [data, setData] = useState<undefined | BaseJsonLdItemInterface>(
    iri ? getDataFromApiPlatform(iri) : undefined
  )

  useEffect(() => {
    if (!iri || data) return

    if (noCache) {
      removeDataFromApiPlatform(iri)
    }
    fetchDataFromApiPlatform(iri).then((data) => {
      setData(data)
    })
    // Read once at mount: `data` is the cache hit that decides to skip it, and a
    // new `iri` mounts a new component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!iri) return null

  if (!data) return <LittleLoader />

  if (component) {
    const FC = component
    return <FC data={data} />
  }

  return (
    <>
      {goToResource ? (
        <>
          <Link
            target={"_blank"}
            to={generateLinkFromIri({ iri, scope, resourceAction }) ?? ""}
            className={"fc"}
          >
            <Badge>{data?.name ?? data["@id"]}</Badge>
          </Link>
        </>
      ) : (
        <span className={"fc"}>{data?.[currentProperty] ?? "-"}</span>
      )}
    </>
  )
}
