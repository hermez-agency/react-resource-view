import { createRepository, getCollectionItems } from "react-resource-view"
import type { ValueOptionInterface } from "react-data-form"

/**
 * The options of a relation input: the records of `path` whose
 * `labelField` matches what was typed, valued by `valueField` — the IRI
 * for API Platform, the key for a foreign key.
 *
 * Written by `react-resource-view generate resources`. The query filters on
 * `labelField`, which the API must accept as a filter of the collection.
 */
export function relationSearch(
  path: string,
  { valueField, labelField }: { valueField: string; labelField: string }
) {
  const repository = createRepository({ path })

  return async (query: string): Promise<ValueOptionInterface[]> => {
    const { data } = await repository.getCollection(
      query ? { [labelField]: query } : {}
    )

    return getCollectionItems(data).map((item) => ({
      value: item[valueField],
      label: String(item[labelField] ?? item[valueField]),
    }))
  }
}
