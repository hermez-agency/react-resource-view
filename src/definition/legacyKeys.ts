/**
 * The 0.x keys the development checks recognise, and the 1.0 rewrite of each —
 * the `detect` and `hint` of `migrations/1.0.json`, kept here so the checks do
 * not ship the whole list of changes to the browser. A test keeps the two in
 * step.
 */

/** Change id → the rewrite to suggest. */
export const LEGACY_HINTS: Record<string, string> = {
  "RV1-PERM-001":
    'declare `permissions` instead — everything is allowed by default, so only restrictions are written: `permissions: { delete: false }`, `permissions: "readonly"` or `permissions: ["list", "read"]`.',
  "RV1-PERM-004":
    "the export is a permission: `permissions: { export: true }` at the root of the resource — and it is allowed by default when the dialect can export.",
  "RV1-VIEW-001":
    "`view` is gone. What is common to every action goes to the root of the resource (`form`, `fullWidth`, `components`, `titleField`, `description`, `className`); what belongs to the list goes to `views.list` (`layouts`, `filters`, `pageSize`, `rowActions`).",
  "RV1-VIEW-003":
    "a view's title is `title`, and it is derived from the resource's `name` (\"Edit — Tasks\") — declare it only to say something else.",
  "RV1-VIEW-004":
    'the text of an action\'s button is `views.<action>.buttonLabel: "…"`.',
  "RV1-VIEW-006": "the page size is `views.list.pageSize`.",
  "RV1-VIEW-007":
    "the filters are `views.list.filters: { inputs, initial }` — the filter form and the values applied before any is chosen.",
  "RV1-VIEW-008":
    "the field naming a record is `titleField` (at the root of the resource, or on a board, gallery, calendar, timeline, tree or map layout).",
  "RV1-VIEW-009":
    "a view has no `id` or `icon` of its own: the resource's `icon` is used; a layout takes `id` and `icon`.",
  "RV1-BEHAV-001":
    "`behavior` is gone: `openIn` → `open`, `closeAfterUpdate`/`refreshDataAfterUpdate`/`redirectToAfterUpdate` → `afterSave`, `rowActions` → `views.list.rowActions`, `canExport` → `permissions.export`, `eventSourced` → `realtime` (root), `openRecordIn` → `views.read.open`, `selectable`/`bulkActions` → `views.list.selectable`/`views.list.bulkActions`.",
  "RV1-BEHAV-002":
    '`open: "page" | "dialog" | "drawer"` on the action\'s view (`window` is now `page`, `popup` is `dialog`).',
  "RV1-BEHAV-003":
    'what follows a save is `afterSave: "close" | "stay" | "reload" | { redirect: (item) => string }` on `views.create` or `views.update`.',
  "RV1-BEHAV-004":
    'the buttons of a row are `views.list.rowActions: ["read", "update", "delete"]`.',
  "RV1-BEHAV-005": "live updates are `realtime: true` at the root of the resource.",
  "RV1-BEHAV-006":
    "`openRecordIn` does not exist here: a card opens the record's `read` view where `views.read.open` says. `selectable` and `bulkActions` are options of the list: `views.list.selectable`, `views.list.bulkActions`.",
  "RV1-LAYOUT-001":
    "a list's layouts are `views.list.layouts: [layout.table(), layout.board({ … })]`.",
  "RV1-LAYOUT-003": "this option of `layout.cards` was renamed: `grid` → `columns`.",
  "RV1-LAYOUT-004":
    "this option of `layout.board` was renamed: `identifierKey` → `groupBy`, `identifierKeyList` → `columns`.",
  "RV1-LAYOUT-005":
    "this option of `layout.calendar` was renamed: `dateKey` → `dateField`, `endDateKey` → `endDateField`, `titleKey` → `titleField`, `colorKey` → `colorField`.",
  "RV1-LAYOUT-006":
    "this option of `layout.timeline` was renamed: `startDateKey` → `startField`, `endDateKey` → `endField`, `titleKey` → `titleField`, `groupKey` → `groupBy`, `statusKey` → `statusField`.",
  "RV1-LAYOUT-007":
    "this option of `layout.split` was renamed: `emptySelected` → `emptyState`, `redirectReadToList` → `readInList`, `resourceAction` → `action`.",
  "RV1-LAYOUT-009":
    "a layout's text is `label`; its URL id is its type (`board`), or `id` to change it.",
  "RV1-LAYOUT-010": "a layout's components are `components: { list, row, item }`.",
  "RV1-LAYOUT-013":
    'a card opens the record\'s `read` view where that view says: `views: { read: { open: "drawer", expandable: true } }` instead of `layout.board({ openRecord, expandable })`.',
  "RV1-LAYOUT-014":
    "the selection is the list's, for every layout: `views: { list: { selectable, bulkActions } }` instead of `layout.board({ selectable, bulkActions })`.",
  "RV1-COMP-001":
    "components are injected through `components: { view, list, row, item, … }` (at the root, per action or per layout).",
  "RV1-COMP-002": "the wrapper of a resource's views is `components: { wrapper }`.",
  "RV1-COMP-003": "what an empty list draws is `components.empty`.",
  "RV1-TABS-001":
    "a record's sub-views are `tabs: { orientation, aside, items: [{ resource, filter }] }` on `views.read` or `views.update`.",
  "RV1-TABS-002":
    "a tab is `{ id, label, icon, description, resource, action, filter, defaultData, component }`.",
  "RV1-TABS-003":
    "a tab is narrowed to the record with `filter: ({ item }) => ({ … })`, and `defaultData: ({ item }) => ({ … })` presets what is created from it.",
  "RV1-DATA-002":
    "code around the data goes in `hooks: { beforeList, beforeRead, beforeCreate, beforeUpdate, beforeDelete, afterSave, afterDelete }`.",
  "RV1-DATA-003":
    "a hand-written data access goes in `repository: { getCollection, getItem, createItem, updateItem, removeItem }`.",
  "RV1-DATA-004":
    "the creation quota is `quota: { get: (context) => ({ current, max }), fallback }`.",
  "RV1-DATA-005":
    "this key is built by `createViewResource` and cannot be declared.",
  "RV1-SCOPE-001":
    "a resource does not name its scope: list it in the `resources` of the scope instead.",
}

/** Where a 0.x key is found, the key, and the change it belongs to. */
export const LEGACY_KEYS: [level: string, key: string, change: string][] = [
  ["resource", "canRead", "RV1-PERM-001"],
  ["resource", "canList", "RV1-PERM-001"],
  ["resource", "canCreate", "RV1-PERM-001"],
  ["resource", "canUpdate", "RV1-PERM-001"],
  ["resource", "canDelete", "RV1-PERM-001"],
  ["behavior", "canExport", "RV1-PERM-004"],
  ["resource", "view", "RV1-VIEW-001"],
  ["view", "name", "RV1-VIEW-003"],
  ["view", "label", "RV1-VIEW-004"],
  ["view", "itemsPerPage", "RV1-VIEW-006"],
  ["view", "formFilter", "RV1-VIEW-007"],
  ["view", "defaultFilter", "RV1-VIEW-007"],
  ["view", "titleKey", "RV1-VIEW-008"],
  ["view", "id", "RV1-VIEW-009"],
  ["view", "icon", "RV1-VIEW-009"],
  ["view", "behavior", "RV1-BEHAV-001"],
  ["behavior", "openIn", "RV1-BEHAV-002"],
  ["behavior", "closeAfterUpdate", "RV1-BEHAV-003"],
  ["behavior", "refreshDataAfterUpdate", "RV1-BEHAV-003"],
  ["behavior", "redirectToAfterUpdate", "RV1-BEHAV-003"],
  ["behavior", "rowActions", "RV1-BEHAV-004"],
  ["behavior", "eventSourced", "RV1-BEHAV-005"],
  ["behavior", "openRecordIn", "RV1-BEHAV-006"],
  ["behavior", "selectable", "RV1-BEHAV-006"],
  ["behavior", "bulkActions", "RV1-BEHAV-006"],
  ["view", "viewVariants", "RV1-LAYOUT-001"],
  ["layout:cards", "grid", "RV1-LAYOUT-003"],
  ["layout:board", "identifierKey", "RV1-LAYOUT-004"],
  ["layout:board", "identifierKeyList", "RV1-LAYOUT-004"],
  ["layout:calendar", "dateKey", "RV1-LAYOUT-005"],
  ["layout:calendar", "endDateKey", "RV1-LAYOUT-005"],
  ["layout:calendar", "titleKey", "RV1-LAYOUT-005"],
  ["layout:calendar", "colorKey", "RV1-LAYOUT-005"],
  ["layout:timeline", "startDateKey", "RV1-LAYOUT-006"],
  ["layout:timeline", "endDateKey", "RV1-LAYOUT-006"],
  ["layout:timeline", "titleKey", "RV1-LAYOUT-006"],
  ["layout:timeline", "groupKey", "RV1-LAYOUT-006"],
  ["layout:timeline", "statusKey", "RV1-LAYOUT-006"],
  ["layout:split", "emptySelected", "RV1-LAYOUT-007"],
  ["layout:split", "redirectReadToList", "RV1-LAYOUT-007"],
  ["layout:split", "resourceAction", "RV1-LAYOUT-007"],
  ["layout", "name", "RV1-LAYOUT-009"],
  ["layout", "rowComponent", "RV1-LAYOUT-010"],
  ["layout", "listComponent", "RV1-LAYOUT-010"],
  ["layout", "itemComponent", "RV1-LAYOUT-010"],
  ["layout:board", "openRecord", "RV1-LAYOUT-013"],
  ["layout:board", "expandable", "RV1-LAYOUT-013"],
  ["layout:board", "selectable", "RV1-LAYOUT-014"],
  ["layout:board", "bulkActions", "RV1-LAYOUT-014"],
  ["view", "viewComponent", "RV1-COMP-001"],
  ["view", "listComponent", "RV1-COMP-001"],
  ["view", "rowComponent", "RV1-COMP-001"],
  ["view", "itemComponent", "RV1-COMP-001"],
  ["resource", "decoratorComponent", "RV1-COMP-002"],
  ["components", "noResult", "RV1-COMP-003"],
  ["view", "subViewResource", "RV1-TABS-001"],
  ["tab", "slug", "RV1-TABS-002"],
  ["tab", "name", "RV1-TABS-002"],
  ["tab", "viewComponent", "RV1-TABS-002"],
  ["tab", "resourceId", "RV1-TABS-002"],
  ["tab", "resourceAction", "RV1-TABS-002"],
  ["tab", "onInitViewResource", "RV1-TABS-003"],
  ["resource", "preGetCollection", "RV1-DATA-002"],
  ["resource", "preGetItem", "RV1-DATA-002"],
  ["resource", "preCreate", "RV1-DATA-002"],
  ["resource", "preUpdate", "RV1-DATA-002"],
  ["resource", "getCollection", "RV1-DATA-003"],
  ["resource", "getItem", "RV1-DATA-003"],
  ["resource", "createItem", "RV1-DATA-003"],
  ["resource", "updateItem", "RV1-DATA-003"],
  ["resource", "removeItem", "RV1-DATA-003"],
  ["resource", "limit", "RV1-DATA-004"],
  ["resource", "resourceBuild", "RV1-DATA-005"],
  ["resource", "onChange", "RV1-DATA-005"],
  ["resource", "@type", "RV1-DATA-005"],
  ["resource", "scope", "RV1-SCOPE-001"],
]
