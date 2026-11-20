# @tinyhaptic/mascot

The Tiny Haptic mascot: a pair of round eyes over a small mouth. One copy for the website and the accounting app.

- `mascotSvg({ id, face })`: the inside of its `<svg viewBox="0 0 32 32" class="mascot">`.
- `enliven(svg, { mood, colors })`: brings it to life (watches the cursor, blinks, gets poked, dozes). Returns a function that stops it. The theme is `data-theme` on `<html>`.
- `mascot.css`: its animations.
- `markup`, `portrait`, `emblem`, `poses`, `shapes`: the geometry, for favicons and images.

## Install

```bash
bun add github:tinyhaptic/mascot#v1.0.0
```

## Change it

1. Edit `src/`, then `bun run check && bun run build` (`dist/` is committed: installs from GitHub don't build).
2. Commit, `git tag v1.1.0 && git push --follow-tags`.
3. In each project: `bun add github:tinyhaptic/mascot#v1.1.0`. On the website, also run `bun scripts/mascot-assets.ts` to redraw the favicon and brand files.
