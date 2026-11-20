import { type Face } from "./mascot.js";
export type MascotSvgOptions = {
    /** The face it is drawn with. Default "hi". */
    face?: Face;
    /** Unique on the page: the eye outline is defined once under this id and referenced. */
    id: string;
};
/**
 * The inside of a mascot's `<svg viewBox="0 0 32 32">`: the eyes, each with
 * its shadow, the pupils, the mouth, and the spirals a knocked-out mascot
 * shows (hidden unless the svg has the class `dead`). The eyes, pupils and
 * shadows keep their colours on light and dark themes; the outline and mouth
 * take currentColor.
 */
export declare function mascotSvg({ face, id }: MascotSvgOptions): string;
