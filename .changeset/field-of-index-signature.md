---
"react-resource-view": patch
---

Fixed: field names (`titleField`, `groupBy`, `form.inputs`…) are also checked on an item that extends `BaseJsonLdItemInterface`, instead of accepting any string because of its index signature.
