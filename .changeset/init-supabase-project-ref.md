---
"react-resource-view": patch
---

Fixed: `init -b supabase -u https://<ref>.supabase.co` fills `SUPABASE_PROJECT_REF` in `.env` from the URL, and ends on `make api-schema` (which reads `.env`) instead of `pnpm run api-schema`, which failed on the empty project id
