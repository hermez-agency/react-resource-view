---
"react-resource-view": patch
---

Fixed: a word that is not a command (`migrat`, `wombat`) exits with code 1 and suggests the closest command ("Unknown command "migrat" — did you mean migrate?"), instead of creating `src/views/migratLayout.tsx`; `help` prints the help instead of creating `helpLayout.tsx`

`help [command]` and `--version` / `-v` work, and the help lists the options under the command they belong to. The shortcut without a command (`npx react-resource-view Heatmap`) still works, but only for a name that starts with a capital letter.
