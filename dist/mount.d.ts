import { type EnlivenOptions } from "./live.js";
import type { Face } from "./mascot.js";
export type MascotHtmlOptions = {
    /** Alive it watches, blinks and can be poked; otherwise a still drawing. Default true. */
    alive?: boolean;
    /** The face it is drawn with. Default "hi" (or "lost" with that mood). */
    face?: Face;
    /** A standing mood that replaces its resting calm: "lost" for a 404 page. */
    mood?: "lost";
    /** Classes for the mascot, e.g. its size and colour. Its outline takes the text colour. */
    className?: string;
    /** Unique on the page. Default: a counter. */
    id?: string;
};
export type MountOptions = Omit<MascotHtmlOptions, "id"> & EnlivenOptions;
/** Adds the mascot's styles to the page, once. */
export declare function addStyles(doc?: Document): void;
/**
 * The whole mascot as HTML: a `<span class="mascot">` holding the drawing and,
 * when alive, the canvas the live mascot draws on. For server rendering, or
 * any page that writes HTML; `mount` brings it to life on the client.
 */
export declare function mascotHtml({ alive, face, mood, className, id, }?: MascotHtmlOptions): string;
/**
 * Puts a mascot on the page and brings it to life. `target` is either a
 * mascot already drawn (a `.mascot`, from `mascotHtml` or a component), which
 * is used as it is, or an element to draw one into. Adds the styles once.
 * Returns a function that stops it, and takes away a mascot it drew.
 */
export declare function mount(target: Element, { alive, face, mood, className, ...options }?: MountOptions): () => void;
