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
// The pair sits in the middle, the eyes just touching.
export const EYES = {
    at: [9.3, 22.7],
    cy: 12.3,
    eye: { rx: 6.6, ry: 6.6 },
    shut: { rx: 5.5, ry: 0.5, drop: 1.1 },
    reach: { x: 2.2, y: 3 },
    mouth: 16,
};
/** Colours that stay the same on light and dark themes. Only the outline follows the theme. */
/** `rage` is the one colour around the mascot: the sparks it throws off when it is furious, and the marks of a hard poke. */
export const COLOR = {
    eye: "#ffffff",
    pupil: "#0a0a0a",
    rage: "#ff3b30",
};
// A flat mouth with `inset` two thirds of `w` is a plain arc (a quadratic curve).
const mouths = {
    smile: { w: 2.4, upper: 1.5, lower: 1.5, inset: 1.6, y: 24.6 },
    flat: { w: 2, upper: 0.2, lower: 0.2, inset: 1.33, y: 25.3 },
    frown: { w: 2.2, upper: -1.3, lower: -1.3, inset: 1.47, y: 26 },
    worry: { w: 1.7, upper: -0.85, lower: -0.85, inset: 1.13, y: 25.8 },
    snore: { w: 0.95, upper: -1.15, lower: 1.15, inset: 0, y: 25.7 },
    scowl: { w: 2.5, upper: -1.1, lower: -1.1, inset: 1.67, y: 26 },
    gape: { w: 1.25, upper: -1.67, lower: 1.67, inset: 0, y: 25.7 },
};
const both = (x, y) => [
    { x, y },
    { x, y },
];
const hi = {
    open: 1,
    lid: 0,
    cheek: 0,
    tilt: 0,
    size: 1,
    pupil: { rx: 2.79, ry: 3.69 },
    pupils: both(-1.26, 0.99),
    mouth: mouths.smile,
};
export const poses = {
    hi,
    blink: { ...hi, open: 0 },
    // Eyes stretched wide, pupils shrunk to pinpoints.
    surprised: {
        ...hi,
        mouth: mouths.gape,
        size: 1.09,
        pupil: { rx: 1.8, ry: 2.34 },
    },
    // Lids slanting down and outward, eyes cast down.
    sad: {
        ...hi,
        mouth: mouths.frown,
        lid: 0.3,
        tilt: -0.34,
        size: 0.98,
        pupils: both(-1.08, 2.16),
    },
    // Unimpressed: lids lowered level, with a slight frown.
    skeptical: {
        ...hi,
        mouth: mouths.flat,
        lid: 0.36,
        tilt: 0.1,
        pupil: { rx: 2.52, ry: 3.33 },
    },
    // Poked once too often: lids slanting down toward the middle, a glare.
    annoyed: {
        ...hi,
        mouth: mouths.flat,
        lid: 0.3,
        tilt: 0.42,
        cheek: 0.12,
        pupil: { rx: 2.34, ry: 3.06 },
        pupils: both(-0.54, 1.26),
    },
    // Poked far too often: a hard scowl, lids slammed down toward the middle, pupils like pinheads.
    furious: {
        ...hi,
        mouth: mouths.scowl,
        lid: 0.36,
        tilt: 0.62,
        cheek: 0.2,
        size: 1.06,
        pupil: { rx: 1.9, ry: 2.5 },
        pupils: both(0, 1.5),
    },
    // Interested in something: eyes a touch wider, pupils larger.
    curious: { ...hi, size: 1.04, pupil: { rx: 3.15, ry: 4.14 } },
    // The lights just came on: screwed up against the glare.
    dazzled: { ...hi, mouth: mouths.flat, lid: 0.4, cheek: 0.5, tilt: 0.16 },
    // The lights just went out: eyes stretched wide, trying to see.
    peering: {
        ...hi,
        mouth: mouths.gape,
        size: 1.16,
        pupil: { rx: 2.88, ry: 3.78 },
    },
    // Doesn't know where it is: brows-up worry in the lids, small pupils, a tight little frown.
    lost: {
        ...hi,
        mouth: mouths.worry,
        lid: 0.17,
        tilt: -0.3,
        size: 1.04,
        pupil: { rx: 2.3, ry: 3.05 },
        pupils: both(0, 0.4),
    },
    // Spun around: eyes wide, small pupils (the script sends them round and round), mouth slack.
    dizzy: { ...hi, size: 1.07, pupil: { rx: 1.6, ry: 1.6 }, mouth: mouths.gape },
    // Fast asleep: eyes shut, a small round snoring mouth.
    asleep: { ...hi, open: 0, mouth: mouths.snore },
    // Knocked out: eyes wide and the pupils gone, a spiral turning in each eye instead (see `spiral`), mouth agape.
    dead: {
        ...hi,
        size: 1.04,
        pupil: { rx: 0.01, ry: 0.01 },
        pupils: both(0, 0),
        mouth: mouths.gape,
    },
    // Half-shut and drooping, smaller pupils tucked under the lid.
    sleepy: {
        ...hi,
        mouth: mouths.flat,
        lid: 0.56,
        tilt: -0.1,
        pupil: { rx: 2.61, ry: 3.42 },
        pupils: both(-1.8, 0.72),
    },
};
const n = (v) => +v.toFixed(2);
const lerp = (a, b, t) => a + (b - a) * t;
/** One eye. `side` is -1 for the left eye, 1 for the right. */
function eye(eyes, cx, side, { open, lid, cheek, tilt, size }) {
    const rx = lerp(eyes.shut.rx, eyes.eye.rx * size, open);
    const ry = lerp(eyes.shut.ry, eyes.eye.ry * size, open);
    const cy = eyes.cy + eyes.shut.drop * (1 - open);
    if (lid < 0.005 && cheek < 0.005) {
        // An oval that flattens as it shuts; over the last third of the way its
        // ends tighten from the oval's curve to the round ends of the shut bar.
        const corner = lerp(eyes.shut.ry, rx, Math.min(1, open * 3));
        const flat = n((rx - corner) * 2);
        const arc = (x, y) => `a${n(corner)} ${n(ry)} 0 0 1 ${n(corner * x)} ${n(ry * y)}`;
        return `M${n(cx - rx + corner)} ${n(cy - ry)}h${flat}${arc(1, 1)}${arc(-1, 1)}h${-flat}${arc(-1, -1)}${arc(1, -1)}z`;
    }
    // What shows of the oval between the lids: a straight upper lid, which may
    // slant, and a lower one that bows upward (the cheek under a smiling eye).
    // The upper lid runs between the two points where its line cuts the oval
    // (offsets `a` and `b` from the centre); with no lid, both are the top.
    let [a, b] = [
        { x: 0, y: -ry },
        { x: 0, y: -ry },
    ];
    if (lid >= 0.005) {
        const drop = Math.min(lid, 0.995) * 2 * ry - ry; // the lid's height at the middle of the eye
        const slope = -side * tilt * Math.min(1, lid / 0.1); // the slant comes in as the lid comes down
        const [qa, qb, qc] = [
            1 / rx ** 2 + slope ** 2 / ry ** 2,
            (2 * drop * slope) / ry ** 2,
            drop ** 2 / ry ** 2 - 1,
        ];
        const root = Math.sqrt(Math.max(0, qb ** 2 - 4 * qa * qc));
        const at = (x) => ({ x, y: drop + slope * x });
        [a, b] = [at((-qb - root) / (2 * qa)), at((-qb + root) / (2 * qa))];
    }
    const bottom = Math.max(Math.max(a.y, b.y) + 0.4, ry * (1 - 0.9 * cheek));
    const hb = cheek < 0.005 ? 0 : rx * Math.sqrt(Math.max(0, 1 - (bottom / ry) ** 2));
    const arc = `A${n(rx)} ${n(ry)} 0 0 1 `;
    return (`M${n(cx + a.x)} ${n(cy + a.y)}L${n(cx + b.x)} ${n(cy + b.y)}` +
        `${arc}${n(cx + hb)} ${n(cy + bottom)}` +
        (hb
            ? `Q${n(cx)} ${n(cy + bottom - cheek * ry * 0.5)} ${n(cx - hb)} ${n(cy + bottom)}`
            : "") +
        `${arc}${n(cx + a.x)} ${n(cy + a.y)}z`);
}
const pupil = (cx, cy, { rx, ry }) => `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0z`;
function mouth(x, { w, upper, lower, inset, y }) {
    const [l, r] = [x - w, x + w];
    const [li, ri] = [l + inset, r - inset];
    return (`M${n(l)} ${n(y)}C${n(li)} ${n(y + upper)} ${n(ri)} ${n(y + upper)} ${n(r)} ${n(y)}` +
        `C${n(ri)} ${n(y + lower)} ${n(li)} ${n(y + lower)} ${n(l)} ${n(y)}z`);
}
/**
 * Path data for a pose: both eyes in one path, both pupils in another, and the mouth. The
 * pupils are meant to be clipped to the eyes (they slide under the lid); in
 * `hi` they sit wholly inside, so a static copy can skip the clip.
 */
export const shapes = (pose, eyes = EYES) => ({
    eye: eyes.at.map((cx, i) => eye(eyes, cx, i ? 1 : -1, pose)).join(""),
    pupil: eyes.at
        .map((cx, i) => pupil(cx + pose.pupils[i].x, eyes.cy + pose.pupils[i].y, pose.pupil))
        .join(""),
    mouth: mouth(eyes.mouth, pose.mouth),
});
/** The knocked-out eye's spiral: how many turns, how far out it reaches, and its line. */
export const SPIRAL = { turns: 2.25, r: 4.6, weight: 1.25 };
/** Path data for one spiral, centred on the origin so it can be placed and turned about its middle. */
export function spiral({ turns, r } = SPIRAL) {
    const end = 2 * Math.PI * turns;
    const steps = Math.ceil(turns * 32);
    let d = "M0 0";
    for (let i = 1; i <= steps; i++) {
        const t = (end * i) / steps;
        d += `L${n(((r * t) / end) * Math.cos(t))} ${n(((r * t) / end) * Math.sin(t))}`;
    }
    return d;
}
function paint(eyes, pose, line, weight, withMouth) {
    const s = shapes(pose, eyes);
    const stroke = (color) => `stroke="${color}" stroke-linejoin="round" stroke-width="${n(1.3 * weight)}"`;
    return (`<path d="${s.eye}" fill="${COLOR.eye}" ${stroke(line)}/>` +
        `<path d="${s.pupil}" fill="${COLOR.pupil}"/>` +
        (withMouth
            ? `<path d="${s.mouth}" fill="none" stroke="${line}" stroke-linejoin="round" stroke-width="${n(1.5 * weight)}"/>`
            : ""));
}
/**
 * Standalone SVG markup for any pose, outlined in `line`. Unlike `markup`, the
 * pupils are clipped to the eyes, so they can tuck under a lid.
 */
export function portrait(pose, line, id = "mascot-eyes") {
    const s = shapes(pose);
    const stroke = (color) => `stroke="${color}" stroke-linejoin="round" stroke-width="1.3"`;
    return (`<clipPath id="${id}"><path d="${s.eye}"/></clipPath>` +
        `<path d="${s.eye}" fill="${COLOR.eye}"/>` +
        `<path d="${s.pupil}" fill="${COLOR.pupil}" clip-path="url(#${id})"/>` +
        `<path d="${s.eye}" fill="none" ${stroke(line)}/>` +
        `<path d="${s.mouth}" fill="none" stroke="${line}" stroke-linejoin="round" stroke-width="1.5"/>`);
}
/** Standalone SVG markup for a face, outlined in `line`. */
export function markup(face, line) {
    const drawn = paint(EYES, poses[face], line, 1, true);
    if (face !== "dead")
        return drawn;
    const swirl = `fill="none" stroke="${COLOR.pupil}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${SPIRAL.weight}"`;
    return (drawn +
        EYES.at
            .map((cx) => `<path d="${spiral()}" transform="translate(${cx} ${EYES.cy})" ${swirl}/>`)
            .join(""));
}
/**
 * A bolder cut of the mascot for tiny sizes (favicon, app icons): only the
 * eyes, bigger, looking a little down, with a heavier line, centred in the box.
 */
export function emblem(line) {
    const SPREAD = 7.75; // each eye's centre, from the middle
    const GROW = (SPREAD - 1.3) / EYES.eye.rx; // leaves a sliver between the eyes' heavy outlines
    const bold = {
        ...EYES,
        at: [16 - SPREAD, 16 + SPREAD],
        cy: 16,
        eye: { rx: EYES.eye.rx * GROW, ry: EYES.eye.ry * GROW },
    };
    const pose = {
        ...hi,
        pupil: { rx: hi.pupil.rx * GROW, ry: hi.pupil.ry * GROW },
        pupils: both(-0.2 * GROW, 0.7 * GROW), // looking a little down, clear of the heavy outline
    };
    return paint(bold, pose, line, 1.5, false);
}
/**
 * A pose as a flat list of numbers, for blending, and back. `AT` says where
 * things sit in the list: the four pupil offsets (x, y, x, y) start at
 * `AT.pupils`.
 */
export const AT = { open: 0, pupils: 7 };
export const flatten = ({ open, lid, cheek, tilt, size, pupil: p, pupils: [a, b], mouth: m, }) => [
    open,
    lid,
    cheek,
    tilt,
    size,
    p.rx,
    p.ry,
    a.x,
    a.y,
    b.x,
    b.y,
    m.w,
    m.upper,
    m.lower,
    m.inset,
    m.y,
];
export const unflatten = (v) => ({
    open: v[0],
    lid: v[1],
    cheek: v[2],
    tilt: v[3],
    size: v[4],
    pupil: { rx: v[5], ry: v[6] },
    pupils: [
        { x: v[7], y: v[8] },
        { x: v[9], y: v[10] },
    ],
    mouth: { w: v[11], upper: v[12], lower: v[13], inset: v[14], y: v[15] },
});
