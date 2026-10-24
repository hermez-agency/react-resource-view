---
"react-resource-view": patch
---

Fixed: `ApiUri` shows a fallback instead of an endless loader when the relation responds with an error, `noCache` rereads an iri that is already cached, a changed `iri` is picked up, and the cache is invalidated when the linked resource publishes `onChange`.
