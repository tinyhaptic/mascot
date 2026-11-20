import { css } from "./css.js";
import { type EnlivenOptions, enliven } from "./live.js";
import type { Face } from "./mascot.js";
import { mascotSvg } from "./svg.js";

export type MountOptions = EnlivenOptions & {
	/** Alive (the default) it watches, blinks and can be poked; otherwise a still drawing. */
	alive?: boolean;
	/** The face a still mascot is drawn with. Default "hi" (or "lost" with that mood). */
	face?: Face;
	/** Classes for the mascot's <svg>, e.g. its size and colour. Its outline takes the text colour. */
	className?: string;
};

const STYLE_ID = "tinyhaptic-mascot";

/** Adds the mascot's styles to the page, once. */
export function addStyles(doc: Document = document) {
	if (doc.getElementById(STYLE_ID)) return;
	const style = doc.createElement("style");
	style.id = STYLE_ID;
	style.textContent = css;
	doc.head.append(style);
}

let count = 0;

/**
 * The whole mascot as an `<svg>` string: for server rendering, or any page
 * that writes HTML. `mount` brings it to life on the client.
 */
export function mascotHtml({
	alive = true,
	face,
	mood,
	className,
	id = `tinyhaptic-mascot-${++count}`,
}: Omit<MountOptions, "colors"> & { id?: string } = {}): string {
	const shown = face ?? mood ?? "hi";
	const classes = ["mascot", shown === "dead" && "dead", className]
		.filter(Boolean)
		.join(" ");
	const attrs = [
		`viewBox="0 0 32 32"`,
		`aria-hidden="true"`,
		`class="${classes.replace(/"/g, "&quot;")}"`,
		alive && "data-alive",
		mood && `data-mood="${mood}"`,
	]
		.filter(Boolean)
		.join(" ");
	return `<svg ${attrs}>${mascotSvg({ face: shown, id })}</svg>`;
}

/**
 * Puts a mascot on the page and brings it to life. `target` is either a
 * mascot already drawn (an `svg.mascot`, from `mascotHtml` or a component),
 * which is used as it is, or an element to draw one into. Adds the styles
 * once. Returns a function that stops it, and takes away a mascot it drew.
 */
export function mount(
	target: Element,
	{ alive = true, face, mood, colors, className }: MountOptions = {},
): () => void {
	addStyles(target.ownerDocument);
	let svg = target.matches("svg.mascot")
		? (target as SVGSVGElement)
		: undefined;
	const drawn = !svg;
	if (!svg) {
		target.insertAdjacentHTML(
			"beforeend",
			mascotHtml({ alive, face, mood, className }),
		);
		svg = target.lastElementChild as SVGSVGElement;
	}
	const stop = alive ? enliven(svg, { mood, colors }) : undefined;
	return () => {
		stop?.();
		if (drawn) svg.remove();
	};
}
