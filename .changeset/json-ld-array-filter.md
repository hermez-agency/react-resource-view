---
"react-resource-view": patch
---

Fixed: on the default JSON-LD backend, an array filter goes out as `status[]=a&status[]=b`, instead of `status=a&status=b`, of which API Platform kept only the last value
