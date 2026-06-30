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

## Populate from citerag
citerag has a read-only exporter that emits exactly this node format. With citerag
running, fetch it and replace the sample data:

```bash
# all dialogues (each becomes a parallel top-level thread)
curl 'http://localhost:5000/api/timeline/export' -o data.json

# or one dialogue, or without synthetic doc-root nodes:
curl 'http://localhost:5000/api/timeline/export?document_id=dlg-xxxx&doc_roots=0' -o data.json
```

The `download=1` variant (also linked as **Timeline JSON** in citerag's
`/dialogues` page) saves it as `timeline-data.json` — rename to `data.json` here.

### Images / assets (Pages has no asset server)
citerag asset links (`/api/assets/<id>/file`, `data/assets/<file>`) won't resolve
once published. The exporter can fix them:

```bash
# A) rewrite links to a static base, then copy the files alongside
curl 'http://localhost:5000/api/timeline/export?assets=rewrite&asset_base=assets/' -o data.json
mkdir -p assets && cp /path/to/citerag/data/assets/*.{png,jpg,jpeg,webp,gif} assets/ 2>/dev/null

# B) inline images as base64 data URIs — self-contained, no copying (but bigger file)
curl 'http://localhost:5000/api/timeline/export?assets=inline' -o data.json
```

`assets=keep` (default) leaves links as-is. External `https://…` image URLs (e.g.
GitHub user-attachments) are always left untouched and work anywhere.

## Status
Scaffold with sample data; the citerag → `data.json` exporter is built (above).
Still optional: a fancier canvas/lane tree (currently a DOM indented tree).
**Image URLs must be statically hosted** (committed files or GitHub
user-attachments CDN), since Pages has no asset server — citerag `/api/assets/...`
links won't resolve once published.
