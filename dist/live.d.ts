export type EnlivenOptions = {
    /** A standing mood that replaces its resting calm: "lost" for a 404 page. */
    mood?: "lost";
    /**
     * What it throws onto the page: the lines of a poke and the z's it sleeps
     * with. Any CSS colour, `var(--x)` included. Default: its outline colour,
     * faded.
     */
    colors?: {
        poke?: string;
        z?: string;
    };
    /**
     * Where mascot.riv and rive.wasm are served from (`mascot assets <dir>`
     * writes them). Default `/mascot/<version>/`.
     */
    assets?: string;
};
/**
 * Brings a mascot drawn by `mascotHtml` (or a component) to life. `root` is
 * its `.mascot` element. Returns a function that stops it.
 */
export declare function enliven(root: HTMLElement, { mood, colors: inks, assets, }?: EnlivenOptions): () => void;
