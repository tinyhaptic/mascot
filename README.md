# @tinyhaptic/mascot

The Tiny Haptic mascot: a pair of tall oval eyes, each casting a hard shadow, over a small mouth. It watches the cursor, blinks, gets poked, loses its temper, gets dizzy and falls asleep. One copy for the website and the accounting app.

Public so the apps can install it without tokens; not open source (see [LICENSE](LICENSE)).

```bash
bun add github:tinyhaptic/mascot#v1.2.2
```

## Serve its files

The live mascot is a Rive file played by Rive's WebAssembly runtime. Both are served from your site, at `/mascot/<version>/`, which can be cached for good. Write them on every install and keep them out of git:

```jsonc
// package.json
"scripts": { "postinstall": "mascot assets public" }
```

```gitignore
public/mascot/
```

Until they load (or if they can't), the mascot is a drawing of the same face.

## Use it

React 19 (drawn on the server, alive in the browser; its styles come with it):

```tsx
import { Mascot } from "@tinyhaptic/mascot/react";

<Mascot className="size-6 text-foreground" />
<Mascot alive={false} face="sleepy" />
```

Astro (drawn on the server, alive only with `alive`):

```astro
---
import Mascot from "@tinyhaptic/mascot/astro";
---
<Mascot class="size-10 text-brand" alive />
<Mascot class="size-28" alive mood="lost" />
```

Anything else:

```js
import { mount, mascotHtml } from "@tinyhaptic/mascot";

const stop = mount(document.querySelector("#logo"), { className: "size-8" }); // draws one in, alive
mount(document.querySelector(".mascot")); // or brings one drawn by mascotHtml() to life
stop(); // stops it, and takes away a mascot it drew
```

- The outline and mouth take the text colour; the eyes, pupils and shadows keep theirs.
- The theme is `data-theme="dark"` on `<html>`. Its pupils open wider in the dark.
- `pokeColor` / `zColor` (`colors: { poke, z }` in `mount`) colour the lines of a poke and the z's it sleeps with: any CSS colour, `var(--x)` too. By default, its outline colour, faded.
- Hovering it gets its attention. To count a larger area (say, the link holding it and a name), mark that area with `data-mascot-host`.
- `assets` serves the files from somewhere else.
- What flies off it is drawn on a canvas five times its size, centred on it, so leave it room (no `overflow: hidden` close around it).

Also exported: `markup`, `portrait`, `emblem`, `poses`, `shapes` (the geometry, for images), `favicon()` and `icon()` (SVG strings), `css` (also as `@tinyhaptic/mascot/mascot.css`) and `VERSION`.

## Icons

```bash
bunx mascot icons public           # favicon.svg and apple-touch-icon.png
bunx mascot icons public --brand   # and brand/tinyhaptic-icon-{dark,light}.png
```

The PNGs need `rsvg-convert` (`brew install librsvg`).

## Change it

- The face: `src/mascot.ts` (poses and geometry). The live mascot is built from it by `scripts/rive.ts` into `mascot.riv`, with the [Rive CLI](https://rive.app/docs/cli) (`brew install --cask rive-cli`). Preview it with `rive rive/mascot`.
- What it does: `src/live.ts`, which drives the Rive file's view model.
- Styles: `src/css.ts`.

Installs from GitHub don't build, so `mascot.riv`, `dist/` and `mascot.css` are committed. A pre-commit hook (lefthook, installed by `bun install`) rebuilds them when their sources change. Then:

1. `bun run check`.
2. Bump `version` in package.json, commit, `git tag v1.2.3 && git push && git push --tags`.
3. In each app: `bun add github:tinyhaptic/mascot#v1.2.3` (its postinstall writes the new files), and `bunx mascot icons public` if the face changed (the website with `--brand`).
