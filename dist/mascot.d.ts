/**
 * Geometry of the Tiny Haptic mascot: a pair of tall oval eyes, each casting a
 * hard shadow to one side so it reads as a thick disc standing off the page,
 * over a small mouth, in a 32×32 viewBox.
 *
 * A face is a `Pose`: a handful of numbers. `shapes` turns a pose into path
 * data. scripts/rive.ts builds the live mascot (mascot.riv) from the same
 * poses, so the drawing and the live one always match.
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
    /** How far it sits right of the middle. */
    dx?: number;
    /** How much higher the right corner sits than the left (a lopsided smirk). */
    slant?: number;
};
/** A tongue hanging from the middle of the mouth. */
type Tongue = {
    /** How far right of the mouth's middle it hangs. */
    dx: number;
    /** How far it reaches down from the mouth, and its half-width. */
    len: number;
    w: number;
    /** Its tilt, in degrees: positive swings its tip to the left. */
    turn: number;
};
/** What each eye can wear on its own (a wink): the lids, and how big it is. */
export type Lids = Pick<Pose, "open" | "lid" | "cheek" | "tilt" | "size">;
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
    /** Each eye's own lids, over the pair's (left, right). */
    eyes?: [Partial<Lids>, Partial<Lids>];
    tongue?: Tongue;
};
export type Face = "hi" | "blink" | "surprised" | "sad" | "skeptical" | "sleepy" | "curious" | "dazzled" | "annoyed" | "peering" | "lost" | "furious" | "dizzy" | "asleep" | "dead" | "yawn" | "cheeky" | "focused" | "derp" | "crosseyed" | "sideeye" | "smug" | "whistle" | "sneeze" | "achoo";
/** Where the eyes sit and how big they are. */
export type Eyes = {
    /** Centre x of each eye, and the centre y they share. */
    at: readonly [number, number];
    cy: number;
    /** The open eye: an oval. */
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
    /** How far each eye's shadow is offset behind it. */
    depth: Point;
    /** Centre x of the mouth: under the middle of the eyes and their shadows together. */
    mouth: number;
};
export declare const EYES: Eyes;
/** Colours that stay the same on light and dark themes. Only the outline follows the theme. */
/** `rage` is the one colour around the mascot: the sparks it throws off when it is furious, and the marks of a hard poke. */
export declare const COLOR: {
    readonly eye: "#ffffff";
    readonly pupil: "#0a0a0a";
    readonly shadow: "#8a8a8a";
    readonly rage: "#ff3b30";
    readonly tongue: "#ff6f8e";
};
export declare const poses: Record<Face, Pose>;
/** One eye's pose: the pair's, with that eye's own lids over it (0 left, 1 right). */
export declare const eyePose: (pose: Pose, i: number) => Pose;
/** Where the pair looks when the face is at rest: between where its two pupils sit. */
export declare const gazeOf: ({ pupils: [l, r] }: Pose) => Point;
/** The mouth's corners: [x, y] left and right. */
export declare const corners: ({ w, y, dx, slant }: Mouth, x?: number) => readonly [readonly [number, number], readonly [number, number]];
/** Where the tongue hangs from: the middle of the mouth, shifted along it. */
export declare const tongueRoot: (m: Mouth, t: Tongue, x?: number) => {
    x: number;
    y: number;
};
/**
 * Path data for a pose: both eyes in one path, both pupils in another, and the mouth. The
 * pupils are meant to be clipped to the eyes (they slide under the lid); in
 * `hi` they sit wholly inside, so a static copy can skip the clip.
 */
export declare const shapes: (pose: Pose, eyes?: Eyes) => {
    eye: string;
    pupil: string;
    mouth: string;
    tongue: string;
};
/** The tongue, filled and outlined in `line`, for faces that put it out. */
export declare const tongueSvg: (d: string, line: string) => string;
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
 * eyes, bigger, looking down and to the right, with a heavier line and a
 * deeper shadow, eyes and shadow centred together in the box.
 */
export declare function emblem(line: string): string;
export {};
