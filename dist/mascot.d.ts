/**
 * Geometry of the Tiny Haptic mascot: a pair of round eyes with round black
 * pupils, over a small mouth, in a 32×32 viewBox.
 *
 * A face is a `Pose`: a handful of numbers. `shapes` turns a pose into path
 * data, so any two faces can be blended by blending their numbers. That is how
 * the live mascot (`enliven` in ./live.ts) moves smoothly from one face to the next.
 *
 * After changing anything here, tag a new version, bump it in the website and
 * the app, and run the website's `bun scripts/mascot-assets.ts` to redraw the
 * favicon and brand files.
 */
type Point = {
    x: number;
    y: number;
};
/**
 * The mouth is a closed loop of two curves between its corners. When both sag
 * the same way the loop is flat and reads as a line (smile, frown); when they
 * part it opens into an "o".
 */
type Mouth = {
    /** Half the width. */
    w: number;
    /** How far the upper and lower curves sag (negative: arch). */
    upper: number;
    lower: number;
    /** How far in from the corners the curves start to bend. */
    inset: number;
    /** Height of the corners. */
    y: number;
};
export type Pose = {
    /** 1 wide open … 0 shut. */
    open: number;
    /** A flat upper lid: 0 out of the way … 1 fully lowered. */
    lid: number;
    /** The lower lid pushed up by a smile: 0 out of the way … 1 up to mid-eye. */
    cheek: number;
    /**
     * The slope of the upper lids, mirrored between the eyes: positive lowers
     * their inner ends (stern), negative raises them (worried). Only a lowered
     * lid shows it.
     */
    tilt: number;
    /** The eyes' size: 1 as drawn, more when they widen. */
    size: number;
    /** The pupil: an oval. */
    pupil: {
        rx: number;
        ry: number;
    };
    /** Each pupil's offset from the centre of its eye. */
    pupils: [Point, Point];
    mouth: Mouth;
};
export type Face = "hi" | "blink" | "surprised" | "sad" | "skeptical" | "sleepy" | "curious" | "dazzled" | "annoyed" | "peering" | "lost" | "furious" | "dizzy" | "asleep" | "dead";
/** Where the eyes sit and how big they are. */
export type Eyes = {
    /** Centre x of each eye, and the centre y they share. */
    at: readonly [number, number];
    cy: number;
    /** The open eye: an oval (drawn as a circle). */
    eye: {
        rx: number;
        ry: number;
    };
    /** The shut eye: a flat bar with round ends, sitting `drop` lower. */
    shut: {
        rx: number;
        ry: number;
        drop: number;
    };
    /** How far a pupil can travel from where it rests. */
    reach: Point;
    /** Centre x of the mouth: under the middle of the eyes. */
    mouth: number;
};
export declare const EYES: Eyes;
/** Colours that stay the same on light and dark themes. Only the outline follows the theme. */
/** `rage` is the one colour around the mascot: the sparks it throws off when it is furious, and the marks of a hard poke. */
export declare const COLOR: {
    readonly eye: "#ffffff";
    readonly pupil: "#0a0a0a";
    readonly rage: "#ff3b30";
};
export declare const poses: Record<Face, Pose>;
/**
 * Path data for a pose: both eyes in one path, both pupils in another, and the mouth. The
 * pupils are meant to be clipped to the eyes (they slide under the lid); in
 * `hi` they sit wholly inside, so a static copy can skip the clip.
 */
export declare const shapes: (pose: Pose, eyes?: Eyes) => {
    eye: string;
    pupil: string;
    mouth: string;
};
/** The knocked-out eye's spiral: how many turns, how far out it reaches, and its line. */
export declare const SPIRAL: {
    readonly turns: 2.25;
    readonly r: 4.6;
    readonly weight: 1.25;
};
/** Path data for one spiral, centred on the origin so it can be placed and turned about its middle. */
export declare function spiral({ turns, r }?: {
    readonly turns: 2.25;
    readonly r: 4.6;
    readonly weight: 1.25;
}): string;
/**
 * Standalone SVG markup for any pose, outlined in `line`. Unlike `markup`, the
 * pupils are clipped to the eyes, so they can tuck under a lid.
 */
export declare function portrait(pose: Pose, line: string, id?: string): string;
/** Standalone SVG markup for a face, outlined in `line`. */
export declare function markup(face: Face, line: string): string;
/**
 * A bolder cut of the mascot for tiny sizes (favicon, app icons): only the
 * eyes, bigger, looking a little down, with a heavier line, centred in the box.
 */
export declare function emblem(line: string): string;
/**
 * A pose as a flat list of numbers, for blending, and back. `AT` says where
 * things sit in the list: the four pupil offsets (x, y, x, y) start at
 * `AT.pupils`.
 */
export declare const AT: {
    readonly open: 0;
    readonly pupils: 7;
};
export declare const flatten: ({ open, lid, cheek, tilt, size, pupil: p, pupils: [a, b], mouth: m, }: Pose) => number[];
export declare const unflatten: (v: number[]) => Pose;
export {};
