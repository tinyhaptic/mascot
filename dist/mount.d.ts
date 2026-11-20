import { type EnlivenOptions } from "./live.js";
import type { Face } from "./mascot.js";
export type MountOptions = EnlivenOptions & {
    /** Alive (the default) it watches, blinks and can be poked; otherwise a still drawing. */
    alive?: boolean;
    /** The face a still mascot is drawn with. Default "hi" (or "lost" with that mood). */
    face?: Face;
    /** Classes for the mascot's <svg>, e.g. its size and colour. Its outline takes the text colour. */
    className?: string;
};
/** Adds the mascot's styles to the page, once. */
export declare function addStyles(doc?: Document): void;
/**
 * The whole mascot as an `<svg>` string: for server rendering, or any page
 * that writes HTML. `mount` brings it to life on the client.
 */
export declare function mascotHtml({ alive, face, mood, className, id, }?: Omit<MountOptions, "colors"> & {
    id?: string;
}): string;
/**
 * Puts a mascot on the page and brings it to life. `target` is either a
 * mascot already drawn (an `svg.mascot`, from `mascotHtml` or a component),
 * which is used as it is, or an element to draw one into. Adds the styles
 * once. Returns a function that stops it, and takes away a mascot it drew.
 */
export declare function mount(target: Element, { alive, face, mood, colors, className }?: MountOptions): () => void;
