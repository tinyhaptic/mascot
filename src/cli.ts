#!/usr/bin/env node
/**
 * Writes the static copies of the mascot into a site's public folder:
 *
 *   mascot icons <dir>           favicon.svg and apple-touch-icon.png
 *   mascot icons <dir> --brand   and brand/tinyhaptic-icon-{dark,light}.png (1024px)
 *
 * The PNGs need `rsvg-convert` (macOS: brew install librsvg).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { favicon, icon } from "./icons.js";

const [command, dir, ...flags] = process.argv.slice(2);
if (command !== "icons" || !dir) {
	console.error("Usage: mascot icons <public dir> [--brand]");
	process.exit(1);
}

const write = (path: string, data: string | Uint8Array) => {
	const to = join(dir, path);
	mkdirSync(dirname(to), { recursive: true });
	writeFileSync(to, data);
	console.log(`Wrote ${to}`);
};

const png = (src: string, size: number) => {
	const out = spawnSync(
		"rsvg-convert",
		["-w", String(size), "-h", String(size)],
		{ input: src },
	);
	if (out.error || out.status !== 0) {
		console.error(
			"The PNGs need rsvg-convert (macOS: brew install librsvg).",
			out.stderr?.toString() ?? "",
		);
		process.exit(1);
	}
	return out.stdout;
};

write("favicon.svg", favicon());
write("apple-touch-icon.png", png(icon("dark"), 180));
if (flags.includes("--brand")) {
	for (const tone of ["dark", "light"] as const) {
		write(`brand/tinyhaptic-icon-${tone}.png`, png(icon(tone), 1024));
	}
}
