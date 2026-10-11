# Logo / icon files

The application references exactly **two** image files. Replace these two files
with your own artwork — keep the names and the sizes — and the whole app
re-brands itself: browser tab icon, home-screen icon, the logo on the menu and the
About page, and the small mark in the middle of the clock's control bar.

| File          | Size    | Used for                                                              |
| ------------- | ------- | --------------------------------------------------------------------- |
| `icon-48.png` | 48 x 48 | Browser tab icon (favicon), 1x logo on the menu and the clock         |
| `icon-96.png` | 96 x 96 | Home-screen / Apple touch icon, 2x logo, web app manifest (any + maskable) |

## Steps

1. Save your artwork as `icon-48.png` and `icon-96.png`.
2. Drop both files into this folder, overwriting the existing ones.
3. Reload the page. If the app is installed as a home-screen app, close and
   reopen it once so the operating system picks up the new icon.

Keeping the source artwork alongside them is fine — this folder may hold larger
masters or named copies (for example `TARUMT_shield_96x96.png`). The app only
ever loads `icon-48.png` and `icon-96.png`.

If the app is served from a web server, hard-refresh once (Ctrl+F5, or
pull-to-refresh on a phone) to clear the cached image. Bump the `CACHE`
constant in `sw.js` if you want offline clients to be forced to update.

## Design notes

* The 48 px file is the one people see in a browser tab — keep it simple and
  high contrast; avoid thin lines and small text.
* The 96 px file is also declared as `maskable` in the manifest, so keep the
  important part of the design inside the middle **80 %** of the canvas. The
  outer 10 % on each side may be cropped by circular or squircle icon masks.
* A transparent background is fine. The artwork shipped in this repository is a
  rounded square, because that matches the icon mask on most platforms.
* The same mark is also drawn at roughly 24 px in the middle of the clock's
  control bar (taken from the 96 px file on a retina screen), so fine detail and
  small text will not survive there — keep the silhouette readable.

## The built-in default, and `npm run icons`

The artwork currently in this folder is the project's own mark, **not** the one
the generator draws. `tools/generate-icons.mjs` can still draw the original
rook-in-a-clock-face default procedurally:

```bash
npm run icons              # keeps whatever is already here
npm run icons -- --force   # overwrites both files with the generated default
```

Because these two files *are* the brand, the script refuses to overwrite them
unless `--force` is given — a stray build step must not be able to discard a
deployment's artwork. Edit `ROOK_PARTS` and the colour constants in that file
if you want a different generated default.
