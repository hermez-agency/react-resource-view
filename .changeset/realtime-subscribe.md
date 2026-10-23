---
"react-resource-view": minor
---

Added: `realtime` accepts `{ subscribe, withCredentials }`: the channel is pluggable (Supabase Realtime, SSE, WebSockets), and Mercure reconnects with a growing delay and reads the views again when the hub comes back, instead of closing for good after an HTTP error.
