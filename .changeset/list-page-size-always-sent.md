---
"react-resource-view": patch
---

Fixed: the list always sends its page size (30 without `views.list.pageSize`), instead of letting Spring answer 20 rows and Strapi 25 while the pagination counts 30
