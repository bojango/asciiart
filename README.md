# PELAGIC — Living ASCII

An experimental, responsive ASCII-art animation rendered in real time with vanilla HTML, CSS and JavaScript.

The current concept features a procedurally animated jellyfish, flowing tentacles, animated ASCII sea life, drifting particles, colour palettes and a scrolling source-code panel.

## View the website

When GitHub Pages is enabled for this repository, open the Pages URL shown in **Settings → Pages**. On a standard personal repository named `asciiart`, this is normally `https://bojango.github.io/asciiart/`.

## Run locally

Open `index.html` in a desktop browser, or run a local web server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

For iPhone testing, GitHub Pages is recommended. Safari's Files preview does not consistently execute locally opened HTML/JavaScript.

## Controls

| Control | What it does |
| --- | --- |
| Colour | Cycle through four palettes |
| HI-RES / LO-RES | Switch ASCII glyph density |
| Speed | Change animation speed |
| Pause | Pause / resume the scene and code scroll |

Desktop keyboard shortcuts: **C** for colour, **D** for detail, **Space** for pause.

## Publish with GitHub Pages

1. Make the repository **Public**.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose **`main`**, folder **`/(root)`**, then **Save**.
5. Wait until GitHub displays the published website URL.

Future edits to `index.html` on `main` will publish automatically. GitHub Pages hosting is public; don't add secrets to the repository.

## Project files

- `index.html` — current website, v2; self-contained (no external libraries, fonts or image assets required)
- `archive/v1-concept.html` — the earlier first draft
- `previews/` — preview images are available in the project starter ZIP and can be added through GitHub's web uploader
- `.nojekyll` — tells Pages to serve the project as static files

## Development

Edit `index.html` to update the visuals, animation logic and code panel. This is a zero-build static site; there is no npm install or deployment pipeline.

## Status

Concept prototype. Visuals and performance may vary between browsers and iPhone models.