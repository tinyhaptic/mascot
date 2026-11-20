import type { Face } from "./mascot.js";
export type MascotProps = {
    className?: string;
    /** Alive (the default) it watches, blinks and can be poked; otherwise a still drawing. */
    alive?: boolean;
    /** The face it is drawn with. Default "hi". */
    face?: Face;
    /** A standing mood that replaces its resting calm: "lost" for a 404 page. */
    mood?: "lost";
    /** Colours for the lines of a poke and the z's it sleeps with. Any CSS colour, `var(--x)` too. */
    pokeColor?: string;
    zColor?: string;
    /** Where mascot.riv and rive.wasm are served from. Default `/mascot/<version>/`. */
    assets?: string;
};
/**
 * The Tiny Haptic mascot for React 19. Renders on the server as a drawing;
 * in the browser the live mascot takes over. Size it and colour its outline
 * with `className` ("size-6 text-foreground").
 */
export declare function Mascot({ className, alive, face, mood, pokeColor, zColor, assets, }: MascotProps): import("react").JSX.Element;
