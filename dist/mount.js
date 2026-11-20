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
const quote = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/**
 * The whole mascot as HTML: a `<span class="mascot">` holding the drawing and,
 * when alive, the canvas the live mascot draws on. For server rendering, or
 * any page that writes HTML; `mount` brings it to life on the client.
 */
export function mascotHtml({ alive = true, face, mood, className, id = `tinyhaptic-mascot-${++count}`, } = {}) {
    const shown = face ?? mood ?? "hi";
    const classes = ["mascot", className].filter(Boolean).join(" ");
    const attrs = [
        `class="${quote(classes)}"`,
        alive && "data-alive",
        mood && `data-mood="${mood}"`,
    ]
        .filter(Boolean)
        .join(" ");
    const dead = shown === "dead" ? ` class="dead"` : "";
    return (`<span ${attrs}><svg viewBox="0 0 32 32" aria-hidden="true"${dead}>${mascotSvg({ face: shown, id })}</svg>` +
        (alive ? `<canvas aria-hidden="true"></canvas>` : "") +
        `</span>`);
}
/**
 * Puts a mascot on the page and brings it to life. `target` is either a
 * mascot already drawn (a `.mascot`, from `mascotHtml` or a component), which
 * is used as it is, or an element to draw one into. Adds the styles once.
 * Returns a function that stops it, and takes away a mascot it drew.
 */
export function mount(target, { alive = true, face, mood, className, ...options } = {}) {
    addStyles(target.ownerDocument);
    let root = target.matches(".mascot") ? target : undefined;
    const drawn = !root;
    if (!root) {
        target.insertAdjacentHTML("beforeend", mascotHtml({ alive, face, mood, className }));
        root = target.lastElementChild;
    }
    const stop = alive ? enliven(root, { mood, ...options }) : undefined;
    return () => {
        stop?.();
        if (drawn)
            root.remove();
    };
}
