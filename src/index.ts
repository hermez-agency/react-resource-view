/**
 * react-resource-view — public API.
 *
 * Every name exported here is part of the public API, so a new export is a
 * decision: `index.test.ts` snapshots the list and fails until it is updated.
 * Modules that also hold internal helpers are re-exported by name, not with
 * `export *`.
 */

export * from "@/admin/AdminHeader"
export * from "@/admin/AdminLayout"
export type { CommandPaletteOptions } from "@/admin/AdminCommandPalette"
export * from "@/admin/AdminMobileNav"
export * from "@/admin/AdminSidebarNav"
export * from "@/admin/AdminTopBar"
export * from "@/admin/useIsActiveMenuEntry"
export {
  configureApi,
  getApiConfig,
  getApiDialect,
  hasClientIncompatibleSettings,
  resolveDialect,
} from "@/api/apiConfig"
export type { ApiConfigInterface } from "@/api/apiConfig"
export * from "@/api/apiDialectInterface"
export * from "@/api/apiRequestError"
export * from "@/api/collection"
export * from "@/api/collectionShape"
export * from "@/api/createRepository"
export * from "@/api/dialect/djangoDialect"
export * from "@/api/dialect/fastapiDialect"
export * from "@/api/dialect/jsonLdDialect"
export * from "@/api/dialect/restDialect"
export * from "@/api/dialect/springDialect"
export { strapiDialect } from "@/api/dialect/strapiDialect"
export type { StrapiDialectOptionsInterface } from "@/api/dialect/strapiDialect"
export * from "@/api/dialect/supabaseDialect"
export {
  isAbsoluteUrl,
  isEmptyFilterValue,
  toQuerySuffix,
  withoutEmptyValues,
} from "@/api/queryString"
export * from "@/api/realtime"
export * from "@/api/restRepository"
export { configureResourceView, getResourceViewDefaults } from "@/ResourceConfig"
export type {
  ResourceConfigInterface,
  ResourceViewConfiguration,
} from "@/ResourceConfig"
export * from "@/ResourceDefinition"
export * from "@/ViewResource"
export type { BaseJsonLdItemInterface } from "jsonld-item"
export { inspectDefinition } from "@/definition/validateDefinition"
export type { DefinitionProblem } from "@/definition/validateDefinition"
export * from "@/ViewResourceContext"
export { default as ListResourceViewButton } from "@/action/ListResourceViewButton"
export * from "@/action/ResourceViewButton"
export { default as ResourceViewButton } from "@/action/ResourceViewButton"
export * from "@/components/ApiUri"
export { default as ApiUri } from "@/components/ApiUri"
export * from "@/components/ChildViewResourceDialog"
export * from "@/components/ExpandToPageLink"
export * from "@/components/LoadError"
export { default as MetaResourceComponent } from "@/components/MetaResource"
export * from "@/components/MultiViewTab"
export * from "@/hook/useFormByResource"
export * from "@/hook/useQuota"
export {
  createRecord,
  removeRecord,
  updateRecord,
  useResourceMutation,
} from "@/hook/useResourceMutation"
export type {
  CustomMutation,
  MutationOptions,
  ResourceMutation,
} from "@/hook/useResourceMutation"
export * from "@/layout/layout"
export * from "@/layout/useLayout"
export { default as useFormByResource } from "@/hook/useFormByResource"
export * from "@/media/ImageCropDialog"
export * from "@/media/MediaFilesInputController"
export * from "@/media/MediaImageInputController"
export * from "@/media/MediaValue"
export * from "@/media/mediaFile"
export * from "@/media/mediaInput"
export * from "@/menu/menu"
export * from "@/navigation/NavigationIndicator"
export * from "@/navigation/NavigationProgressBar"
export * from "@/navigation/useDelayedVisibility"
export * from "@/navigation/useIsNavigating"
export {
  ChildViewRouteContext,
  isChildRecord,
  useChildViewRoute,
  useInlineChildView,
  useViewLink,
  useViewLinkBuilder,
} from "@/open/childViewRoute"
export type {
  ChildViewRouteInterface,
  ViewLinkInterface,
  ViewLinkParams,
} from "@/open/childViewRoute"
export { open } from "@/open/open"
export type {
  BuiltInOpen,
  CustomOpenOptions,
  OpenFrame,
  OpenFrameProps,
  OpenFrames,
  OpenMode,
  OpenPlacement,
} from "@/open/open"
export * from "@/ports"
export * from "@/provider/ResourceViewProvider"
export { default as ResourceViewProvider } from "@/provider/ResourceViewProvider"
export * from "@/provider/ViewResourceContextProvider"
export { default as ViewResourceContextProvider } from "@/provider/ViewResourceContextProvider"
export { default as useCurrentViewResourceContext } from "@/provider/useCurrentViewResourceContext"
export * from "@/provider/useResolvedViewParams"
export * from "@/routes/routes"
export * from "@/scope/Scope"
export * from "@/scope/scope"
export * from "@/scope/scopeInterface"
export { resolveScope } from "@/scope/resolveScope"
export * from "@/utils/createPage"
export * from "@/utils/createViewResource"
export * from "@/utils/findResource"
export * from "@/utils/isFullWidthView"
export {
  permissionResource,
  useAllowedActions,
  usePermission,
  usePermissionState,
} from "@/utils/permissionResource"
export type {
  PermissionCache,
  PermissionQuery,
  PermissionState,
} from "@/utils/permissionResource"
export * from "@/utils/resolveViewResourceContext"
export { default as ItemRender } from "@/views/list/ItemRender"
export { default as ChangeViewOptionComponent } from "@/views/list/component/ChangeViewOptionComponent"
export * from "@/views/list/component/DefaultItemComponent"
export * from "@/views/list/component/DefaultRowComponent"
export * from "@/views/list/component/DefaultViewComponent"
export * from "@/views/list/component/ExportButton"
export { default as ExportButton } from "@/views/list/component/ExportButton"
export * from "@/views/list/component/ListFilterBar"
export * from "@/views/list/component/ListHeader"
export { default as ListHeader } from "@/views/list/component/ListHeader"
export { default as ListPagination } from "@/views/list/component/ListPagination"
export { default as ListView } from "@/views/list/component/ListView"
export * from "@/views/list/component/NoResult"
export * from "@/views/list/component/calendar/ListCalendar"
export * from "@/views/list/component/card/ListCard"
export { ListChart } from "@/views/list/component/chart/ListChart"
export type {
  ChartAggregate,
  ChartInterval,
} from "@/views/list/component/chart/chartData"
export { default as ListColumn } from "@/views/list/component/columns/ListColumn"
export { default as RowColumn } from "@/views/list/component/columns/RowColumn"
export * from "@/views/list/component/columns/RowWrapperColumn"
export { default as RowWrapperColumnComponent } from "@/views/list/component/columns/RowWrapperColumn"
export * from "@/views/list/component/dump/DumpItemComponent"
export * from "@/views/list/component/dump/DumpRowComponent"
export { default as BaseItemSelect } from "@/views/list/component/item/BaseItemSelectRow"
export * from "@/views/list/component/item/ListItem"
export { ListMap } from "@/views/list/component/map/ListMap"
export * from "@/views/list/component/preview/EventPreview"
export * from "@/views/list/component/preview/PreviewRowComponent"
export * from "@/views/list/component/preview/formatEventPeriod"
export { default as ListSplit } from "@/views/list/component/split/ListSplit"
export * from "@/views/list/component/table/ItemTable"
export { ListTable } from "@/views/list/component/table/ListTable"
export * from "@/views/list/component/table/RowTable"
export { default as ListTimeline } from "@/views/list/component/timeline/ListTimeline"
export { ListTree } from "@/views/list/component/tree/ListTree"
export { default as FormGroupProviderFilter } from "@/views/list/filter/FormGroupProviderFilter"
export * from "@/views/list/filter/useFilter"
export { default as useFilter } from "@/views/list/filter/useFilter"
export * from "@/views/list/hook/useList"
export { default as useList } from "@/views/list/hook/useList"
export * from "@/views/list/provider/ListViewContext"
export { default as ListViewProviderComponent } from "@/views/list/provider/ListViewProvider"
export * from "@/views/list/provider/useListViewContext"
export * from "@/views/list/selection/ListSelectionBar"
export * from "@/views/list/selection/SelectRowCheckbox"
export * from "@/views/list/selection/useListSelection"
export * from "@/views/list/sort/useSort"
export { localSavedViewsStore } from "@/views/list/savedViews/savedViews"
export type {
  ListPreset,
  SavedView,
  SavedViewColumns,
  SavedViewInput,
  SavedViewsStoreInterface,
} from "@/views/list/savedViews/savedViews"
export * from "@/views/read/ReadView"
export { default as RemoveViewComponent } from "@/views/remove/RemoveView"
export { default as EditView } from "@/views/update/EditView"
export { default as getFormByCurrentResourceContext } from "@/views/update/getFormByCurrentResourceContext"
