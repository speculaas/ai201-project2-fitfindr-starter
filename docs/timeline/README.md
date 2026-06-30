# Timeline / Tree viewer (scaffold)

A self-contained static viewer that lives alongside the existing gallery, so the
current `docs/index.html` is untouched. Published at:

```
https://speculaas.github.io/ai201-project2-fitfindr-starter/timeline/
```

## Run locally
It uses `fetch("data.json")`, so serve over HTTP (not `file://`):

```bash
cd docs && python3 -m http.server
# open http://localhost:8000/timeline/
```

## What it does
- **Collapsible tree rail (left)** — the whole forest; click any node to jump
  anywhere; ☰ collapses the rail.
- **Viewport (center)** — the focused node's image, else Mermaid, else text.
- **Recursive bubbles (right)** — the current node's children; click one to drill
  in (it becomes the focus and its own children render). Breadcrumb ascends.
- **Calendar view** — nodes plotted by `date`; a cell shows the top node (image
  or truncated text) with a `+N` badge for extra nodes that day; click a cell to
  load the day's nodes (right) and the top one into the viewport; click a day
  node to jump into the tree.
- **Keyboard** — ← / → siblings (at the root level this switches parallel
  threads), ↑ parent, ↓ first child.

One shared `currentId` drives every pane, so tree clicks, bubble clicks, arrow
keys, and calendar selections all stay in sync.

## Data schema (`data.json`)
A flat node list — `parent_id` builds the tree (this maps 1:1 to citerag turns,
so an exporter is straightforward):

```json
{
  "nodes": [
    {
      "id": "t1",
      "parent_id": null,          // null/absent → a top-level root (parallel thread)
      "date": "2026-03-04",        // ISO date or datetime → drives the calendar (citerag occurred_at)
      "title": "Short label",
      "author": "me",              // optional
      "image": "https://...",      // optional; shown in viewport + calendar/bubble thumbs
      "mermaid": "flowchart TD;...",// optional; rendered if no image
      "text": "Markdown body"      // optional
    }
  ]
}
```
A bare array (`[ {...}, ... ]`) is also accepted.

## Status
Scaffold with sample data. Still to wire: a direct **citerag → `data.json`
exporter** (carry turns + `occurred_at` + image URLs), and replacing the sample
`data.json` with exported content. Image URLs must be statically hosted (committed
or GitHub user-attachments CDN), since Pages has no asset server.
