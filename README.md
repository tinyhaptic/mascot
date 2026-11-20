# @tinyhaptic/mascot

The Tiny Haptic mascot: a pair of round eyes over a small mouth. One copy for the website and the accounting app.

```bash
bun add github:tinyhaptic/mascot#v1.1.0
```

## Use it

React 19 (renders on the server, comes alive in the browser; its styles come with it):

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
mount(document.querySelector("svg.mascot")); // or brings one drawn by mascotHtml() to life
stop(); // stops it, and takes away a mascot it drew
```

The outline and mouth take the text colour; the eyes and pupils keep theirs. The theme is `data-theme="dark"` on `<html>`. `pokeColor` / `zColor` (`colors: { poke, z }` in `mount`) colour what it throws onto the page.

Also exported: `markup`, `portrait`, `emblem`, `poses`, `shapes` (the geometry, for images), `favicon()` and `icon()` (SVG strings), and `css` (also as `@tinyhaptic/mascot/mascot.css`).

## Icons

```bash
bunx mascot icons public           # favicon.svg and apple-touch-icon.png
bunx mascot icons public --brand   # and brand/tinyhaptic-icon-{dark,light}.png
```

The PNGs need `rsvg-convert` (`brew install librsvg`).

## Change it

1. Edit `src/` (styles in `src/css.ts`), then `bun run check && bun run build`. `dist/` and `mascot.css` are committed: installs from GitHub don't build.
2. Bump `version` in package.json, commit, `git tag v1.2.0 && git push && git push --tags`.
3. In each project: `bun add github:tinyhaptic/mascot#v1.2.0`, then `bunx mascot icons public` (the website with `--brand`).
