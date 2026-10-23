---
"react-resource-view": patch
---

Fixed: a page beyond the last one (after a deletion or through a `?filter={"page":50}` link) brings the list back to its last page, instead of an empty screen without pagination.
