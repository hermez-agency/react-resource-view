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
import { resourceRegistered } from "resource-registry"
import { ViewResource } from "@/ViewResource"

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
    iri && !noCache ? getDataFromApiPlatform(iri) : undefined
  )
  const [failed, setFailed] = useState(false)
  // Bumped when the linked resource publishes a change, to read the iri again.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!iri) return
    let cancelled = false

    if (noCache || version > 0) {
      removeDataFromApiPlatform(iri)
    }
    const cached = getDataFromApiPlatform(iri)
    setData(cached)
    setFailed(false)
    if (cached) return

    fetchDataFromApiPlatform(iri)
      .then((fetched) => {
        if (!cancelled) setData(fetched)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [iri, noCache, version])

  useEffect(() => {
    if (!iri) return
    const basePath = iri.replace(/\/[^/]+$/, "")
    const subs = (Object.values(resourceRegistered) as ViewResource[])
      .filter((resource) => resource.path === basePath)
      .map((resource) =>
        resource.onChange.subscribe(() => setVersion((current) => current + 1))
      )
    return () => subs.forEach((sub) => sub.unsubscribe())
  }, [iri])

  if (!iri) return null

  if (failed) return <span className={"fc"}>-</span>

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
