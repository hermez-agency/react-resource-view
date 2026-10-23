---
"react-resource-view": minor
---

Added: `storage: { type: "local", seed: Item[] | () => Item[] }` fills a resource kept in the browser with its first records, written once and only while the storage is empty, instead of writing the Hydra collection into the storage key by hand
