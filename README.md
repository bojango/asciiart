# PELAGIC — Living ASCII

An experimental, responsive ASCII-art animation rendered in real time with vanilla HTML, CSS and JavaScript.

Version 7 couples bell contractions to propulsion: the changing rim drives actual upward/diagonal acceleration, then drag and currents determine the glide. It also prevents the tentacles penetrating the dynamically projected 3D bell silhouette.

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

- `index.html` — current website, v3; self-contained (no external libraries, fonts or image assets required)
- `archive/v1-concept.html` — the earlier first draft
- `previews/` — preview images are available in the project starter ZIP and can be added through GitHub's web uploader
- `.nojekyll` — tells Pages to serve the project as static files

## Motion and source display

The jellyfish remains upright with modest steering angles. Rather than following a precomputed path, each **bell contraction generates a thrust force** along the body axis. The bell refills during recovery and its increased drag slows the animal; water currents and soft viewport boundaries contribute to its trajectory. It can travel vertically and diagonally.

The rope particles use Verlet integration, length constraints and a **recomputed projected collision hull** sampled from the deformed bell geometry on each physics step. Penetrating tentacle points are pushed out, and glyphs within the bell are hidden. This is a stylised 2D/3D physics approximation, not a fluid dynamics simulation.

The lower panel continuously scrolls real JavaScript source in a uniform 9px monochrome Courier font.

## Development

Edit `index.html` to update the visuals, animation logic and code panel. This is a zero-build static site; there is no npm install or deployment pipeline.

## Status

Concept prototype. Visuals and performance may vary between browsers and iPhone models.