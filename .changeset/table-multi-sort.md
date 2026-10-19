---
"react-resource-view": minor
---

feat(views): Shift+click on column headers sorts a table on several columns, with their rank shown, instead of replacing the sort

- A plain click still goes ascending, descending, then no sort, on that column alone; Shift+click keeps the other sorted columns and queues the clicked one behind them (a column already sorted keeps its rank while its direction moves on).
- Once two columns or more are sorted, each header shows its rank next to the arrow. The sort stays in the URL and goes to the API as `order[field]=asc|desc`, in that order.
