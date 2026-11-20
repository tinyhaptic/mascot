/**
 * Geometry of the Tiny Haptic mascot: a pair of tall oval eyes, each casting a
 * hard shadow to one side so it reads as a thick disc standing off the page,
 * over a small mouth, in a 32×32 viewBox.
 *
 * A face is a `Pose`: a handful of numbers. `shapes` turns a pose into path
 * data. scripts/rive.ts builds the live mascot (mascot.riv) from the same
 * poses, so the drawing and the live one always match.
 */

type Point = { x: number; y: number };

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
	pupil: { rx: number; ry: number };
	/** Each pupil's offset from the centre of its eye. */
	pupils: [Point, Point];
	mouth: Mouth;
	/** Each eye's own lids, over the pair's (left, right). */
	eyes?: [Partial<Lids>, Partial<Lids>];
	tongue?: Tongue;
};

export type Face =
	| "hi"
	| "blink"
	| "surprised"
	| "sad"
	| "skeptical"
	| "sleepy"
	| "curious"
	| "dazzled"
	| "annoyed"
	| "peering"
	| "lost"
	| "furious"
	| "dizzy"
	| "asleep"
	| "dead"
	| "yawn"
	| "cheeky"
	| "focused"
	| "derp"
	| "crosseyed"
	| "sideeye"
	| "smug"
	| "whistle"
	| "sneeze"
	| "achoo";

/** Where the eyes sit and how big they are. */
export type Eyes = {
	/** Centre x of each eye, and the centre y they share. */
	at: readonly [number, number];
	cy: number;
	/** The open eye: an oval. */
	eye: { rx: number; ry: number };
	/** The shut eye: a flat bar with round ends, sitting `drop` lower. */
	shut: { rx: number; ry: number; drop: number };
	/** How far a pupil can travel from where it rests. */
	reach: Point;
	/** How far each eye's shadow is offset behind it. */
	depth: Point;
	/** Centre x of the mouth: under the middle of the eyes and their shadows together. */
	mouth: number;
};

// The pair sits a little left of centre to leave room for the shadow.
export const EYES: Eyes = {
	at: [7.9, 22.3],
	cy: 12.3,
	eye: { rx: 5.6, ry: 7.4 },
	shut: { rx: 5.5, ry: 0.5, drop: 1.1 },
	reach: { x: 2.2, y: 3 },
	depth: { x: 2.2, y: 1.5 },
	mouth: 15.7,
};

/** Colours that stay the same on light and dark themes. Only the outline follows the theme. */
/** `rage` is the one colour around the mascot: the sparks it throws off when it is furious, and the marks of a hard poke. */
export const COLOR = {
	eye: "#ffffff",
	pupil: "#0a0a0a",
	shadow: "#8a8a8a",
	rage: "#ff3b30",
	tongue: "#ff6f8e",
} as const;

// A flat mouth with `inset` two thirds of `w` is a plain arc (a quadratic curve).
const mouths = {
	smile: { w: 2.4, upper: 1.5, lower: 1.5, inset: 1.6, y: 24.6 },
	flat: { w: 2, upper: 0.2, lower: 0.2, inset: 1.33, y: 25.3 },
	frown: { w: 2.2, upper: -1.3, lower: -1.3, inset: 1.47, y: 26 },
	worry: { w: 1.7, upper: -0.85, lower: -0.85, inset: 1.13, y: 25.8 },
	snore: { w: 0.95, upper: -1.15, lower: 1.15, inset: 0, y: 25.7 },
	scowl: { w: 2.5, upper: -1.1, lower: -1.1, inset: 1.67, y: 26 },
	gape: { w: 1.25, upper: -1.67, lower: 1.67, inset: 0, y: 25.7 },
	yawn: { w: 2.7, upper: -4.6, lower: 5.4, inset: 0, y: 25.8 },
	tiny: { w: 1.2, upper: 0.3, lower: 0.3, inset: 0.8, y: 25.4 },
	wavy: { w: 2.4, upper: 0.2, lower: 0.2, inset: 1.6, y: 25.4 },
	pucker: { w: 0.65, upper: -0.75, lower: 0.75, inset: 0, y: 25.5 },
	o: { w: 0.8, upper: -0.9, lower: 0.9, inset: 0, y: 25.6 },
	sniff: { w: 1.3, upper: -1.6, lower: 1.6, inset: 0, y: 25.6 },
	achoo: { w: 2.3, upper: -2.6, lower: 3.4, inset: 0, y: 25.6 },
} satisfies Record<string, Mouth>;

const both = (x: number, y: number): [Point, Point] => [
	{ x, y },
	{ x, y },
];
const each = (l: Point, r: Point): [Point, Point] => [l, r];

const hi: Pose = {
	open: 1,
	lid: 0,
	cheek: 0,
	tilt: 0,
	size: 1,
	pupil: { rx: 2.79, ry: 3.69 },
	pupils: both(-1.26, 0.99),
	mouth: mouths.smile,
};

export const poses: Record<Face, Pose> = {
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
	// About to doze off: eyes screwed shut, mouth stretched wide open.
	yawn: {
		...hi,
		mouth: mouths.yawn,
		lid: 0.45,
		cheek: 0.75,
		tilt: -0.15,
		pupils: both(0, 1.5),
	},
	sleepy: {
		...hi,
		mouth: mouths.flat,
		lid: 0.56,
		tilt: -0.1,
		pupil: { rx: 2.61, ry: 3.42 },
		pupils: both(-1.8, 0.72),
	},
	// A wink with the tongue poking out of the corner of a lopsided smile.
	cheeky: {
		...hi,
		mouth: { ...mouths.smile, slant: 0.5 },
		eyes: [{ cheek: 0.35 }, { open: 0 }],
		tongue: { dx: 0.9, len: 4.4, w: 1.75, turn: -14 },
	},
	// Hard at work: lids lowered, eyes on the job below, the tip of the tongue out at the side.
	focused: {
		...hi,
		mouth: { ...mouths.tiny, dx: 0.3, slant: -0.4 },
		lid: 0.32,
		tilt: 0.12,
		pupils: both(-1.4, 2.2),
		tongue: { dx: 1.5, len: 3.3, w: 1.4, turn: -38 },
	},
	// Lights on, nobody home: pupils wandering off on their own, tongue lolling.
	derp: {
		...hi,
		mouth: { ...mouths.wavy, slant: -0.7 },
		pupil: { rx: 2.1, ry: 2.7 },
		pupils: each({ x: 1.6, y: -2.2 }, { x: -1.8, y: 2.6 }),
		tongue: { dx: -1.2, len: 3.5, w: 1.5, turn: 20 },
	},
	// Looking at the end of its own nose.
	crosseyed: {
		...hi,
		mouth: mouths.o,
		size: 1.04,
		pupil: { rx: 2.2, ry: 2.9 },
		pupils: each({ x: 2.4, y: 1.2 }, { x: -2.6, y: 1.2 }),
	},
	// Not sure about this: lids half down, eyes sliding to one side, mouth pulled over.
	sideeye: {
		...hi,
		mouth: { ...mouths.flat, dx: 0.6, slant: -0.5 },
		lid: 0.42,
		tilt: 0.06,
		pupils: both(2.4, 0.9),
	},
	// Pleased with itself: heavy lids, cheeks up, a smirk.
	smug: {
		...hi,
		mouth: { ...mouths.smile, w: 2.2, dx: 0.4, slant: 1.2 },
		lid: 0.4,
		cheek: 0.35,
		tilt: -0.12,
		pupils: both(-0.6, 0.4),
	},
	// Nothing to see here: eyes up and away, lips pursed to whistle (notes drift off while it does).
	whistle: {
		...hi,
		mouth: { ...mouths.pucker, dx: 1.2 },
		pupil: { rx: 2.5, ry: 3.3 },
		pupils: both(1.4, -2.4),
	},
	// A sneeze coming: eyes screwing up, looking up, mouth opening…
	sneeze: {
		...hi,
		mouth: mouths.sniff,
		lid: 0.5,
		cheek: 0.6,
		tilt: -0.25,
		pupils: both(0, -1.5),
	},
	// …and out it comes: eyes squeezed shut, mouth wide.
	achoo: { ...hi, open: 0, mouth: mouths.achoo },
};

/** One eye's pose: the pair's, with that eye's own lids over it (0 left, 1 right). */
export const eyePose = (pose: Pose, i: number): Pose => ({
	...pose,
	...pose.eyes?.[i],
});

/** Where the pair looks when the face is at rest: between where its two pupils sit. */
export const gazeOf = ({ pupils: [l, r] }: Pose): Point => ({
	x: (l.x + r.x) / 2,
	y: (l.y + r.y) / 2,
});

const n = (v: number) => +v.toFixed(2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** One eye. `side` is -1 for the left eye, 1 for the right. */
function eye(
	eyes: Eyes,
	cx: number,
	side: number,
	{ open, lid, cheek, tilt, size }: Pose,
) {
	const rx = lerp(eyes.shut.rx, eyes.eye.rx * size, open);
	const ry = lerp(eyes.shut.ry, eyes.eye.ry * size, open);
	const cy = eyes.cy + eyes.shut.drop * (1 - open);
	if (lid < 0.005 && cheek < 0.005) {
		// An oval that flattens as it shuts; over the last third of the way its
		// ends tighten from the oval's curve to the round ends of the shut bar.
		const corner = lerp(eyes.shut.ry, rx, Math.min(1, open * 3));
		const flat = n((rx - corner) * 2);
		const arc = (x: number, y: number) =>
			`a${n(corner)} ${n(ry)} 0 0 1 ${n(corner * x)} ${n(ry * y)}`;
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
		const at = (x: number) => ({ x, y: drop + slope * x });
		[a, b] = [at((-qb - root) / (2 * qa)), at((-qb + root) / (2 * qa))];
	}
	const bottom = Math.max(Math.max(a.y, b.y) + 0.4, ry * (1 - 0.9 * cheek));
	const hb =
		cheek < 0.005 ? 0 : rx * Math.sqrt(Math.max(0, 1 - (bottom / ry) ** 2));
	const arc = `A${n(rx)} ${n(ry)} 0 0 1 `;
	return (
		`M${n(cx + a.x)} ${n(cy + a.y)}L${n(cx + b.x)} ${n(cy + b.y)}` +
		`${arc}${n(cx + hb)} ${n(cy + bottom)}` +
		(hb
			? `Q${n(cx)} ${n(cy + bottom - cheek * ry * 0.5)} ${n(cx - hb)} ${n(cy + bottom)}`
			: "") +
		`${arc}${n(cx + a.x)} ${n(cy + a.y)}z`
	);
}

const pupil = (cx: number, cy: number, { rx, ry }: Pose["pupil"]) =>
	`M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0z`;

/** The mouth's corners: [x, y] left and right. */
export const corners = ({ w, y, dx = 0, slant = 0 }: Mouth, x = EYES.mouth) =>
	[
		[x + dx - w, y + slant / 2],
		[x + dx + w, y - slant / 2],
	] as const;

function mouth(x: number, m: Mouth) {
	const [[l, yl], [r, yr]] = corners(m, x);
	const [li, ri] = [l + m.inset, r - m.inset];
	const ym = (yl + yr) / 2;
	return (
		`M${n(l)} ${n(yl)}C${n(li)} ${n(ym + m.upper)} ${n(ri)} ${n(ym + m.upper)} ${n(r)} ${n(yr)}` +
		`C${n(ri)} ${n(ym + m.lower)} ${n(li)} ${n(ym + m.lower)} ${n(l)} ${n(yl)}z`
	);
}

/** Where the tongue hangs from: the middle of the mouth, shifted along it. */
export const tongueRoot = (m: Mouth, t: Tongue, x = EYES.mouth) => {
	const [[l, yl], [r, yr]] = corners(m, x);
	return { x: (l + r) / 2 + t.dx, y: (yl + yr) / 2 };
};

/** The tongue: straight sides down from the mouth, a round tip. Drawn hanging, then tilted. */
function tongue(mx: number, m: Mouth, t: Tongue) {
	const { x, y } = tongueRoot(m, t, mx);
	const turn = (t.turn * Math.PI) / 180;
	const at = (px: number, py: number) =>
		`${n(x + px * Math.cos(turn) - py * Math.sin(turn))} ${n(y + px * Math.sin(turn) + py * Math.cos(turn))}`;
	const side = Math.max(0, t.len - t.w);
	return `M${at(-t.w, 0)}L${at(-t.w, side)}A${n(t.w)} ${n(t.w)} 0 0 0 ${at(t.w, side)}L${at(t.w, 0)}z`;
}

/**
 * Path data for a pose: both eyes in one path, both pupils in another, and the mouth. The
 * pupils are meant to be clipped to the eyes (they slide under the lid); in
 * `hi` they sit wholly inside, so a static copy can skip the clip.
 */
export const shapes = (pose: Pose, eyes: Eyes = EYES) => ({
	eye: eyes.at
		.map((cx, i) => eye(eyes, cx, i ? 1 : -1, eyePose(pose, i)))
		.join(""),
	pupil: eyes.at
		.map((cx, i) =>
			pupil(cx + pose.pupils[i].x, eyes.cy + pose.pupils[i].y, pose.pupil),
		)
		.join(""),
	mouth: mouth(eyes.mouth, pose.mouth),
	tongue: pose.tongue ? tongue(eyes.mouth, pose.mouth, pose.tongue) : "",
});

/** The tongue, filled and outlined in `line`, for faces that put it out. */
export const tongueSvg = (d: string, line: string) =>
	d
		? `<path d="${d}" fill="${COLOR.tongue}" stroke="${line}" stroke-linejoin="round" stroke-width="1.1"/>`
		: "";

/** The knocked-out eye's spiral: how many turns, how far out it reaches, and its line. */
export const SPIRAL = { turns: 2.25, r: 4.6, weight: 1.25 } as const;

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

function paint(
	eyes: Eyes,
	pose: Pose,
	line: string,
	weight: number,
	withMouth: boolean,
) {
	const s = shapes(pose, eyes);
	const stroke = (color: string) =>
		`stroke="${color}" stroke-linejoin="round" stroke-width="${n(1.3 * weight)}"`;
	return (
		`<path d="${s.eye}" transform="translate(${n(eyes.depth.x)} ${n(eyes.depth.y)})" fill="${COLOR.shadow}" ${stroke(COLOR.shadow)}/>` +
		`<path d="${s.eye}" fill="${COLOR.eye}" ${stroke(line)}/>` +
		`<path d="${s.pupil}" fill="${COLOR.pupil}"/>` +
		(withMouth
			? tongueSvg(s.tongue, line) +
				`<path d="${s.mouth}" fill="none" stroke="${line}" stroke-linejoin="round" stroke-width="${n(1.5 * weight)}"/>`
			: "")
	);
}

/**
 * Standalone SVG markup for any pose, outlined in `line`. Unlike `markup`, the
 * pupils are clipped to the eyes, so they can tuck under a lid.
 */
export function portrait(pose: Pose, line: string, id = "mascot-eyes") {
	const s = shapes(pose);
	const stroke = (color: string) =>
		`stroke="${color}" stroke-linejoin="round" stroke-width="1.3"`;
	return (
		`<clipPath id="${id}"><path d="${s.eye}"/></clipPath>` +
		`<path d="${s.eye}" transform="translate(${EYES.depth.x} ${EYES.depth.y})" fill="${COLOR.shadow}" ${stroke(COLOR.shadow)}/>` +
		`<path d="${s.eye}" fill="${COLOR.eye}"/>` +
		`<path d="${s.pupil}" fill="${COLOR.pupil}" clip-path="url(#${id})"/>` +
		`<path d="${s.eye}" fill="none" ${stroke(line)}/>` +
		tongueSvg(s.tongue, line) +
		`<path d="${s.mouth}" fill="none" stroke="${line}" stroke-linejoin="round" stroke-width="1.5"/>`
	);
}

/** Standalone SVG markup for a face, outlined in `line`. */
export function markup(face: Face, line: string) {
	const drawn = paint(EYES, poses[face], line, 1, true);
	if (face !== "dead") return drawn;
	const swirl = `fill="none" stroke="${COLOR.pupil}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${SPIRAL.weight}"`;
	return (
		drawn +
		EYES.at
			.map(
				(cx) =>
					`<path d="${spiral()}" transform="translate(${cx} ${EYES.cy})" ${swirl}/>`,
			)
			.join("")
	);
}

/**
 * A bolder cut of the mascot for tiny sizes (favicon, app icons): only the
 * eyes, bigger, looking down and to the right, with a heavier line and a
 * deeper shadow, eyes and shadow centred together in the box.
 */
export function emblem(line: string) {
	const SPREAD = 7.75; // each eye's centre, from the middle
	const GROW = (SPREAD - 1.3) / EYES.eye.rx; // leaves a sliver between the eyes' heavy outlines
	const DEEP = 1.3; // a thicker shadow, so the depth still shows at tab size
	const depth = {
		x: EYES.depth.x * GROW * DEEP,
		y: EYES.depth.y * GROW * DEEP,
	};
	const mx = 16 - depth.x / 2;
	const bold: Eyes = {
		...EYES,
		depth,
		at: [mx - SPREAD, mx + SPREAD],
		cy: 16 - depth.y / 2,
		eye: { rx: EYES.eye.rx * GROW, ry: EYES.eye.ry * GROW },
	};
	const pose: Pose = {
		...hi,
		pupil: { rx: hi.pupil.rx * GROW, ry: hi.pupil.ry * GROW },
		pupils: both(1.05 * GROW, 1.35 * GROW), // looking down and to the right, clear of the heavy outline
	};
	return paint(bold, pose, line, 1.5, false);
}
