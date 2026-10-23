---
"react-resource-view": patch
---

Fixed: the CSV export prefixes with an apostrophe the cells that start with `=`, `+`, `-`, `@`, a tab or a carriage return, instead of letting Excel or LibreOffice run them as formulas when the file is opened (CSV injection, OWASP); the JSON export is unchanged
