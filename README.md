# Face Blur (Web)

Blur all faces in **images** when a webpage loads. Two options: a **browser extension** or an **embedded widget**. Video is not processed.

- **Extension**: Works on any site; images are fetched by the extension so cross-origin images are supported.
- **Widget**: One script for your own site; best with same-origin or CORS-enabled images.

Both use [@vladmandic/face-api](https://github.com/vladmandic/face-api) (Tiny Face Detector) in the browser.

---

## Browser extension

Blur faces in images on any page you visit.

### Setup

1. Install dependencies and copy the face-api build into the extension:
   ```bash
   npm install
   ```
   This runs a postinstall script that copies `face-api.js` from `node_modules` to `extension/`.

2. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Turn on **Developer mode**
   - Click **Load unpacked** and choose the `extension` folder

### Behavior

- On load (and when new images appear), the extension finds all `<img>` elements.
- Each image is fetched via the extension (avoids CORS), then face detection runs and face regions are blurred.
- Processed images are replaced with a data URL of the blurred version.
- Only images with a non-data `src` are processed; already-processed images are skipped.

---

## Embedded widget

Add face blurring to your own site with a single script. Good for privacy or moderation.

### Usage

Include the widget script before `</body>`. It will load face-api from the CDN if needed:

```html
<script src="path/to/face-blur-widget.js"></script>
```

Or host it and use a full URL:

```html
<script src="https://your-domain.com/face-blur-widget.js"></script>
```

The script will:

1. Load face-api from the CDN if not already on the page.
2. Load the Tiny Face Detector model.
3. Find all `<img>` elements and blur detected faces (and watch for new images).

**Adjust blur strength (widget):** use the `data-blur-pixels` attribute on the script tag (default is 16; higher = stronger blur):

```html
<script src="path/to/face-blur-widget.js" data-blur-pixels="24"></script>
```

**Adjust blur (extension):** edit `extension/shared/face-blur.js` and change the `BLUR_PIXELS` constant (default 16).

### Limitations (widget)

- **CORS**: Drawing an image to canvas and reading pixels requires the image to be same-origin or served with CORS headers. Cross-origin images without CORS will not be processable; the widget will skip them.
- **Performance**: Detection runs in the main thread. Pages with many large images may feel slow.
- **Images only**: `<img>` only. No `<video>`, `<canvas>`, or CSS background images.

### Demo

Open `widget/demo.html` in a browser (via a local server if you hit CORS). Demo images use Wikipedia Commons (CORS-friendly).

```bash
npx serve .
# Then open http://localhost:3000/widget/demo.html
```

---

## Project layout

- **extension/** – Chrome extension (Manifest V3)
  - `manifest.json`, `background.js`, `content.js`
  - `shared/face-blur.js` – shared blur logic
  - `face-api.js` – copied by `npm run prepare:extension` / postinstall
- **widget/** – Embeddable script
  - `face-blur-widget.js` – single-file widget
  - `demo.html` – demo page
- **shared/** – Shared face-blur logic (used by extension; widget is self-contained)

---

## Rebuilding the extension

After changing dependencies or if `extension/face-api.js` is missing:

```bash
npm run prepare:extension
# or
npm install
```

---

## Disclaimer

This experimental project was built using Cursor. There may be issues or errors.

---

## License

MIT.
