import { emblem } from "./mascot.js";

const INK = "#0a0a0a";
const PAPER = "#fafafa";

const svg = (body: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n  ${body}\n</svg>\n`;
// The bolder cut of the eyes, scaled about the centre to sit inside a tile.
const inset = (line: string, scale: number) =>
	`<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${emblem(line)}</g>`;

/**
 * The favicon: the eyes on a rounded tile that flips with the browser's
 * theme, dark on a light browser and light on a dark one. Where the media
 * query is ignored it stays a dark tile, which reads on any tab bar.
 */
export const favicon = () =>
	svg(`<style>
    svg { color: ${PAPER}; }
    .tile { fill: ${INK}; }
    @media (prefers-color-scheme: dark) {
      svg { color: ${INK}; }
      .tile { fill: ${PAPER}; }
    }
  </style>
  <rect class="tile" width="32" height="32" rx="8"/>
  ${inset("currentColor", 0.8)}`);

/**
 * The icon: the bolder eyes on a square tile, for app icons and profile
 * pictures (phones and social sites round or crop the corners themselves).
 */
export const icon = (tone: "dark" | "light") => {
	const [fill, line] = tone === "dark" ? [INK, PAPER] : [PAPER, INK];
	return svg(
		`<rect width="32" height="32" fill="${fill}"/>${inset(line, 0.72)}`,
	);
};
