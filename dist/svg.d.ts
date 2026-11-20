import { type Face } from "./mascot.js";
export type MascotSvgOptions = {
    /** The face it is drawn with. Default "hi". */
    face?: Face;
    /** Unique on the page: the eye outline is defined once under this id and referenced. */
    id: string;
};
/**
 * The inside of a mascot's `<svg viewBox="0 0 32 32" class="mascot">`: the
 * parts `enliven` animates (head, eye, pupil, mouth) and the spirals a
 * knocked-out mascot shows. The eyes and pupils keep their colours on light
 * and dark themes; the outline and mouth take currentColor.
 *
 * Wrappers put it in their own `<svg>` (React: `dangerouslySetInnerHTML`,
 * Astro: `set:html`), with the class `mascot`, `data-alive` when it is to be
 * enlivened, and `dead` while the face is "dead".
 */
export declare function mascotSvg({ face, id }: MascotSvgOptions): string;
