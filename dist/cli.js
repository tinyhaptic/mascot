#!/usr/bin/env node
/**
 * Writes the mascot's files into a site's public folder:
 *
 *   mascot assets <dir>          mascot/<version>/{mascot.riv,rive.wasm}, what the
 *                                live mascot loads (and removes older versions)
 *   mascot icons <dir>           favicon.svg and apple-touch-icon.png
 *   mascot icons <dir> --brand   and brand/tinyhaptic-icon-{dark,light}.png (1024px)
 *
 * The PNGs need `rsvg-convert` (macOS: brew install librsvg).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync, } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { favicon, icon } from "./icons.js";
import { VERSION } from "./version.js";
const [command, dir, ...flags] = process.argv.slice(2);
const usage = () => {
    console.error("Usage: mascot assets <public dir>\n       mascot icons <public dir> [--brand]");
    process.exit(1);
};
if (!dir)
    usage();
const write = (path, data) => {
    const to = join(dir, path);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, data);
    console.log(`Wrote ${to}`);
};
const png = (src, size) => {
    const out = spawnSync("rsvg-convert", ["-w", String(size), "-h", String(size)], { input: src });
    if (out.error || out.status !== 0) {
        console.error("The PNGs need rsvg-convert (macOS: brew install librsvg).", out.stderr?.toString() ?? "");
        process.exit(1);
    }
    return out.stdout;
};
if (command === "assets") {
    // Each version in its own folder, so the files can be cached for good.
    const root = join(dir, "mascot");
    const to = join(root, VERSION);
    mkdirSync(to, { recursive: true });
    for (const old of readdirSync(root)) {
        if (old !== VERSION)
            rmSync(join(root, old), { recursive: true, force: true });
    }
    const riv = fileURLToPath(new URL("../mascot.riv", import.meta.url));
    const wasm = createRequire(import.meta.url).resolve("@rive-app/webgl2/rive.wasm");
    copyFileSync(riv, join(to, "mascot.riv"));
    copyFileSync(wasm, join(to, "rive.wasm"));
    console.log(`Wrote ${to}/mascot.riv and rive.wasm`);
}
else if (command === "icons") {
    write("favicon.svg", favicon());
    write("apple-touch-icon.png", png(icon("dark"), 180));
    if (flags.includes("--brand")) {
        for (const tone of ["dark", "light"]) {
            write(`brand/tinyhaptic-icon-${tone}.png`, png(icon(tone), 1024));
        }
    }
}
else
    usage();
