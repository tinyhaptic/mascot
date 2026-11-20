import { css } from "./css.js";
import { enliven } from "./live.js";
import { mascotSvg } from "./svg.js";
const STYLE_ID = "tinyhaptic-mascot";
/** Adds the mascot's styles to the page, once. */
export function addStyles(doc = document) {
    if (doc.getElementById(STYLE_ID))
        return;
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
export function mascotHtml({ alive = true, face, mood, className, id = `tinyhaptic-mascot-${++count}`, } = {}) {
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
export function mount(target, { alive = true, face, mood, colors, className } = {}) {
    addStyles(target.ownerDocument);
    let svg = target.matches("svg.mascot")
        ? target
        : undefined;
    const drawn = !svg;
    if (!svg) {
        target.insertAdjacentHTML("beforeend", mascotHtml({ alive, face, mood, className }));
        svg = target.lastElementChild;
    }
    const stop = alive ? enliven(svg, { mood, colors }) : undefined;
    return () => {
        stop?.();
        if (drawn)
            svg.remove();
    };
}
