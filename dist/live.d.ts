export type EnlivenOptions = {
    /** A standing mood that replaces its resting calm. */
    mood?: "lost";
    /** Colours for what it throws onto the page: the lines of a poke and its z's. Any CSS colour. */
    colors?: {
        poke?: string;
        z?: string;
    };
};
/** Brings a mascot's <svg> to life. Returns a function that stops it. */
export declare function enliven(svg: SVGSVGElement, { mood, colors }?: EnlivenOptions): () => void;
