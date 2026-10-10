# Logo / icon files

The application references exactly **two** image files. Replace these two files
with your own artwork — keep the names and the sizes — and the whole app
re-brands itself: browser tab icon, home-screen icon, and the logo shown on the
menu and the About page.

| File          | Size    | Used for                                                              |
| ------------- | ------- | --------------------------------------------------------------------- |
| `icon-48.png` | 48 x 48 | Browser tab icon (favicon), 1x logo on the menu                       |
| `icon-96.png` | 96 x 96 | Home-screen / Apple touch icon, 2x logo, web app manifest (any + maskable) |

## Steps

1. Save your artwork as `icon-48.png` and `icon-96.png`.
2. Drop both files into this folder, overwriting the existing ones.
3. Reload the page. If the app is installed as a home-screen app, close and
   reopen it once so the operating system picks up the new icon.

If the app is served from a web server, hard-refresh once (Ctrl+F5, or
pull-to-refresh on a phone) to clear the cached image. Bump the `CACHE`
constant in `sw.js` if you want offline clients to be forced to update.

## Design notes

* The 48 px file is the one people see in a browser tab — keep it simple and
  high contrast; avoid thin lines and small text.
* The 96 px file is also declared as `maskable` in the manifest, so keep the
  important part of the design inside the middle **80 %** of the canvas. The
  outer 10 % on each side may be cropped by circular or squircle icon masks.
* A transparent background is fine. The default artwork uses a rounded square
  because that matches the icon mask on most platforms.

## Regenerating the default artwork

```bash
npm run icons
```

This rewrites both PNGs from `tools/generate-icons.mjs`, which draws the
default rook-in-a-clock-face mark procedurally. Edit `ROOK_PARTS` and the
colour constants in that file to design a different default.
