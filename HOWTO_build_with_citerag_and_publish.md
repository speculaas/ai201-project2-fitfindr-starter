# HOWTO: build the gallery data with citerag, and publish to GitHub Pages

Two tiers, kept separate on purpose:

- **Builder = citerag** — a dynamic Flask app you run locally. You author,
  migrate Facebook content, branch threads, and set dates here.
- **Published site = this `docs/` folder** — a static client-side app (HTML/JS +
  `data.json`) served by GitHub Pages. No server runs on Pages; it just reads JSON.

So the loop is: **author in citerag → export → drop static files in `docs/` → commit.**

---

## 1. Run citerag as the builder

citerag lives at `chat/S26/ECE595_002/hw3/citerag_codex`. To keep this gallery's
content separate from your main citerag data, either:

- **Clone it** to a fresh folder and run that copy (simplest), or
- **Point one copy at a separate data dir** (no fork):

  ```bash
  CITERAG_DATA_DIR=~/fb-gallery-data python server/app.py
  # unset → the in-repo ./data (default, unchanged)
  ```

Open `http://localhost:5000`.

## 2. Build / migrate content

Per dialogue (= one conversation thread / "slide"):

1. **Create a dialogue** (optionally paste the source Copilot/M365 URL so the
   provider + conversation id are recorded).
2. **Add turns** — each turn is a Q / (optional reasoning) / A unit. Use
   **"Add turn manually"** to rebuild a Facebook thread by hand.
3. **Branch / thread** — set a turn's parent so replies nest. Multiple root
   turns render as **parallel top-level threads** (a forest) in the tree view.
4. **Set the date** — the manual turn form has a **"When it happened"** field
   (`occurred_at`). Stamp the real Facebook date here; this is what the
   calendar/timeline plots.
5. **Attach images** via the assets manager, or paste an external image URL.
6. **Search** what you've built at `http://localhost:5000/search` (grep-style),
   browse by date at `http://localhost:5000/dialogues`.

### Facebook content (single text per item)
citerag turns are Q-A-reasoning, but a Facebook post/comment is just one text
(+ optional image). citerag still **requires both question and answer** (this
check is intentional and unchanged), so map each FB item like this:

- **question** = a short title / the post's first line → becomes the timeline
  node **title**. This is *not* a throwaway placeholder — it's displayed; if a
  post has no title, repeat its first line.
- **answer** = the full Facebook post/comment text → the node **body**.
- **reasoning** = leave empty.
- **date** = the real FB date in the **"When it happened"** field (`occurred_at`).
- **image** = attach via the assets manager (or paste an external URL).
- **nesting** = set a comment turn's parent to its post turn.

When exporting (step 3a), tick **Plain text (Facebook-style)** so the body shows
without the `Q:/A:` scaffold.

> There's no automated FB importer yet — rebuild threads manually. (A "Download
> Your Information" importer is a possible future step; its timestamps would
> auto-fill `occurred_at`.)

## 3. Export to a viewer

There are two static viewers; pick where to publish.

### 3a. Timeline viewer (`docs/timeline/`) — tree rail + calendar
citerag exports this viewer's node format directly. From
`http://localhost:5000/dialogues`:

- **tick** the dialogues you want (the checkbox is a sibling of the row link, so
  clicking the row still opens it; only the checkbox selects for export),
- optionally tick **Plain text (Facebook-style)**,
- click **Export selected → Timeline JSON**, and save it as `docs/timeline/data.json`.

Or via `curl`:

```bash
# selected ids, Facebook-style body, rewrite asset links + copy the files
curl 'http://localhost:5000/api/timeline/export?ids=dlg-A,dlg-B&text_style=body&assets=rewrite&asset_base=assets/' -o docs/timeline/data.json
mkdir -p docs/timeline/assets && cp /path/to/citerag/data/assets/*.{png,jpg,jpeg,webp,gif} docs/timeline/assets/ 2>/dev/null

# or self-contained (inline images as data URIs), all dialogues:
curl 'http://localhost:5000/api/timeline/export?assets=inline' -o docs/timeline/data.json
```

Endpoint options: **filter** `ids=a,b,c` | `workspace=active` | `document_id=<id>`
| none (all); **assets** `keep` (default) | `rewrite` (+`asset_base`) | `inline`;
**text** `qa` (default) | `body`. See `docs/timeline/README.md`.

### 3b. Original gallery (`docs/index.html`)
Export a dialogue (`GET /api/dialogues/<id>/export`) and convert it to the gallery
schema with the existing script (see `USER_MANUAL.md` / `NESTED_THREADS_MANUAL.md`):

```bash
# append as a new slide in docs/data.json
python3 scripts/convert_dialogue.py --input /path/to/exported-dialogue.json --title "My Slide"

# or as a standalone nested thread file linked from a comment
python3 scripts/convert_dialogue.py --input /path/to/exported-dialogue.json \
  --title "Deep Dive" --nested-output ../docs/nested-deep-dive.json
```

## 4. Publish to GitHub Pages — your questions answered

This repo (`speculaas/ai201-project2-fitfindr-starter`) publishes from the
`docs/` folder, so its project site is:

```
https://speculaas.github.io/ai201-project2-fitfindr-starter/
```

**Subfolder, or overwrite the current content?**
Use a **subfolder** — nothing is overwritten unless you reuse the same
filenames. Put a new stack at `docs/timeline/` and it publishes at:

```
https://speculaas.github.io/ai201-project2-fitfindr-starter/timeline/
```

The existing gallery at `docs/index.html` keeps working untouched. You'd only
overwrite the current gallery if you wrote a new `docs/index.html` / `docs/app.js`
/ `docs/data.json` directly. Recommended: add alongside, decide later.

**Will the current content be overwritten?** No — only same-named files are
replaced. A subfolder (or new filenames) avoids any collision.

**Can this be ported to an arbitrary repo / published as that repo's Pages site?**
Yes — it's pure static and uses **relative** paths (`fetch("data.json")`,
`fetch(nested_json_file)`), so:

- Copy the folder into any repo (root or a subfolder), enable Pages
  (Settings → Pages → source = that branch/folder), and it works as a **project
  site** at `https://<user>.github.io/<repo>/<subfolder>/`.
- For a **user/org root site**, put it in a repo named `<user>.github.io`; it
  then serves at `https://<user>.github.io/`.
- Keep `.nojekyll` (already present) so files starting with `_` aren't stripped.

**Two portability rules to keep it repo-agnostic:**
1. **Never use leading-slash absolute paths** (`/data.json`) — they break under a
   project-site subpath. Keep everything relative (the current app already does).
2. **Images must be statically hosted** — Pages has no Flask asset server. Either
   commit images into the repo (e.g. `docs/assets/…`, referenced relatively) or
   use the **GitHub Issues CDN trick** (absolute `user-attachments` URLs that work
   from any repo). The convert step should emit static URLs, not citerag
   `/api/assets/...` links.

---

## TL;DR
Author in citerag, set each turn's date (for Facebook: `question` = title,
`answer` = body, export with **Plain text**). Then on `/dialogues` tick the
dialogues and **Export selected → Timeline JSON** into `docs/timeline/data.json`
(use `assets=rewrite`+copy or `assets=inline` for images). It's static +
relative-path, so it ports to any repo and publishes as that repo's Pages site,
as long as paths stay relative and images are hosted statically. The original
`docs/index.html` gallery (via `convert_dialogue.py`) still works alongside it.
