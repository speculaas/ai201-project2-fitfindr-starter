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

> Facebook migration: there's no automated FB importer yet. The intended flow is
> to navigate Facebook manually and rebuild each thread as turns here, setting
> each turn's date. (A "Download Your Information" importer is a possible future
> step — its timestamps would auto-fill `occurred_at`.)

## 3. Get the data into the gallery format

Export the dialogue from citerag (`GET /api/dialogues/<id>/export`, or the
in-app Export dialog), then convert it to this gallery's schema with the
existing script (see `USER_MANUAL.md` / `NESTED_THREADS_MANUAL.md`):

```bash
# append as a new slide in docs/data.json
python3 scripts/convert_dialogue.py --input /path/to/exported-dialogue.json --title "My Slide"

# or as a standalone nested thread file linked from a comment
python3 scripts/convert_dialogue.py --input /path/to/exported-dialogue.json \
  --title "Deep Dive" --nested-output ../docs/nested-deep-dive.json
```

> Note: a direct **citerag → gallery exporter** (carrying the tree + dates +
> images automatically) and the **static tree/calendar viewer** described in the
> design discussion are not built yet. Until then, `convert_dialogue.py` is the
> bridge and the current `docs/` gallery is the viewer.

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
Author in citerag (a clone, or `CITERAG_DATA_DIR=...`), set each turn's date,
export → `convert_dialogue.py` → `docs/` (a **subfolder** to preserve the current
gallery). It's static + relative-path, so it ports to any repo and publishes as
that repo's Pages site, as long as paths stay relative and images are hosted
statically.
