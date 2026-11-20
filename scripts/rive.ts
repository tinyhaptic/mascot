/**
 * Builds the live mascot, a Rive file, from the face in src/mascot.ts:
 *
 *   bun run rive
 *
 * It writes rive/mascot/scene.rml, compiles it with the Rive CLI
 * (https://rive.app/docs/cli) and copies the result to mascot.riv.
 * Open the project in the CLI's previewer with `rive rive/mascot`, or hand
 * the .rev to the Rive editor (`rive rive/mascot --once --rev=mascot.rev`).
 *
 * The file is plain Rive, no scripts, built the way the editor builds things:
 *
 * - Each eye is an ellipse seen through an "aperture", a shape whose top edge is
 *   the upper lid and whose bottom edge is the cheek. The aperture clips the
 *   eye, its shadow and the pupil; the lid and cheek edges get their own line,
 *   clipped to the eye.
 * - Every face in `poses` is a one-frame pose. The Face layer of the state
 *   machine holds one state per face and eases between them when the `face`
 *   enum changes.
 * - The rest are layers of their own, each driven by one view model property:
 *   a blink (`shut`), the pupils opening in the dark (`dark`), dizzy pupils
 *   (`dizzy`), z's while `asleep`, the jolt of a poke (`wiggle`) or a rage
 *   (`rage`, and sparks: `spark1`…`spark4`, taken in turn), and the lines a poke throws out (`impact`, at
 *   `pokeX`/`pokeY`). Breathing and the knocked-out spirals' spin always run.
 * - Where the pupils look (`lookX`/`lookY`) and how the head follows
 *   (`headX`/`headY`) are bound numbers, eased by an interpolating converter.
 *
 * Deciding what to do — following the cursor, blinking, getting bored, losing
 * its temper — stays in the page (src/live.ts), which writes
 * these properties.
 */
import { $ } from "bun";

import {
	COLOR,
	corners,
	EYES,
	eyePose,
	gazeOf,
	SPIRAL,
	poses,
	tongueRoot,
	type Face,
	type Pose,
} from "../src/mascot.ts";

const dir = `${import.meta.dir}/../rive/mascot`;

// The face is drawn 4× (32 units → 128) in the middle of an artboard five
// faces wide: room on every side for the sparks, z's and poke lines to fly
// off it. The page lays the canvas over the logo to match (inset: -200%).
const S = 4;
const SIZE = 32 * S * 5;
const O = (SIZE - 32 * S) / 2; // the face box's corner
const at = (u: number) => O + u * S; // face units → artboard
const rel = (u: number) => (u - 16) * S; // face units → from the face's middle

// ── markup ──────────────────────────────────────────────────────────────────
let last = 1;
const id = () => `0:${++last}`;
const n = (v: number) => String(+v.toFixed(4));
type Attr = string | number | boolean | undefined;
const attrs = (a: Record<string, Attr>) =>
	Object.entries(a)
		.filter(([, v]) => v !== undefined)
		.map(([k, v]) => ` ${k}="${typeof v === "number" ? n(v) : v}"`)
		.join("");
const indent = (s: string) => s.replace(/^/gm, "    ");
const el = (
	tag: string,
	a: Record<string, Attr> = {},
	...kids: (string | false | undefined)[]
) => {
	const body = kids.filter(Boolean).join("\n");
	return body
		? `<${tag}${attrs(a)}>\n${indent(body)}\n</${tag}>`
		: `<${tag}${attrs(a)}/>`;
};
const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`;

// Property keys (`rive schema <Type> --animatable`).
const K = {
	x: 13,
	y: 14,
	rotation: 15,
	scaleX: 16,
	scaleY: 17,
	opacity: 18,
	width: 20,
	height: 21,
	vx: 24,
	vy: 25,
	inRot: 84,
	inDist: 85,
	outRot: 86,
	outDist: 87,
	color: 37,
	cornerBL: 162,
	cornerBR: 163,
} as const;

// ── the view model ──────────────────────────────────────────────────────────
const VM = id();
const VMI = id();
const FACES = Object.keys(poses) as Face[];
const faceEnum = id();
const faceValue = Object.fromEntries(FACES.map((f) => [f, id()])) as Record<
	Face,
	string
>;
type Prop = { id: string; kind: string; init?: string | number | boolean };
const props: Record<string, Prop> = {};
const prop = (name: string, kind: string, init?: Prop["init"]) =>
	(props[name] = { id: id(), kind, init }).id;
const P = {
	face: prop("face", "EnumCustom", faceValue.hi),
	lookX: prop("lookX", "Number", gazeOf(poses.hi).x),
	lookY: prop("lookY", "Number", gazeOf(poses.hi).y),
	headX: prop("headX", "Number", 0),
	headY: prop("headY", "Number", 0),
	shut: prop("shut", "Boolean", false),
	dark: prop("dark", "Boolean", false),
	dizzy: prop("dizzy", "Boolean", false),
	asleep: prop("asleep", "Boolean", false),
	whistle: prop("whistle", "Boolean", false),
	wiggle: prop("wiggle", "Trigger"),
	pop: prop("pop", "Trigger"),
	hop: prop("hop", "Trigger"),
	rage: prop("rage", "Trigger"),
	impact: prop("impact", "Trigger"),
	pokeX: prop("pokeX", "Number", 16),
	pokeY: prop("pokeY", "Number", 16),
	impactTurn: prop("impactTurn", "Number", 0),
	// One trigger per burst of sparks: the page takes them in turn, so a burst still flying
	// isn't cut short by the next.
	spark1: prop("spark1", "Trigger"),
	spark2: prop("spark2", "Trigger"),
	spark3: prop("spark3", "Trigger"),
	spark4: prop("spark4", "Trigger"),
	ink: prop("ink", "Color", "FF0A0A0A"),
	ink3: prop("ink3", "Color", "FF999999"),
	impactColor: prop("impactColor", "Color", "FF787878"),
};
const bind = (p: string, key: number, converterId?: string) =>
	el("DataBindContext", {
		sourcePathIds: `${VM}-${p}`,
		propertyKey: key,
		converterId,
	});

// Converters: the gaze snaps into place like a real eye, the head follows more slowly, the poke
// lands in artboard space.
const conv = {
	look: id(),
	head: id(),
	poke: id(),
	lookEase: id(),
	headEase: id(),
	scale: id(),
};
const ease = (x1: number, y1: number, x2: number, y2: number) =>
	el("CubicEaseInterpolator", { x1, y1, x2, y2 });
const converters = [
	// A saccade: fast, slowing into place and stopping dead (no overshoot). Written every frame
	// while the eyes follow something moving, the same ease smooths that into pursuit.
	el(
		"DataConverterInterpolator",
		{
			interpolationType: "cubic",
			duration: 0.12,
			name: "Saccade",
			id: conv.lookEase,
		},
		ease(0.25, 1, 0.5, 1),
	),
	el(
		"DataConverterInterpolator",
		{
			interpolationType: "cubic",
			duration: 0.35,
			name: "Follow",
			id: conv.headEase,
		},
		ease(0.3, 0.6, 0.3, 1),
	),
	el("DataConverterOperationValue", {
		operationType: "multiply",
		operationValue: S,
		name: "Face units",
		id: conv.scale,
	}),
	el(
		"DataConverterGroup",
		{ name: "Look", id: conv.look },
		el("DataConverterGroupItem", { converterId: conv.lookEase }),
		el("DataConverterGroupItem", { converterId: conv.scale }),
	),
	el(
		"DataConverterGroup",
		{ name: "Head", id: conv.head },
		el("DataConverterGroupItem", { converterId: conv.headEase }),
		el("DataConverterGroupItem", { converterId: conv.scale }),
	),
	el("DataConverterRangeMapper", {
		minInput: 0,
		maxInput: 32,
		minOutput: O,
		maxOutput: at(32),
		name: "Face to artboard",
		id: conv.poke,
	}),
];

// ── paint ───────────────────────────────────────────────────────────────────
const fill = (color: string) =>
	el(
		"Fill",
		{ name: "Fill" },
		el("SolidColor", { colorValue: color, name: "Color" }),
	);
const fillBound = (p: string, color: string) =>
	el(
		"Fill",
		{ name: "Fill" },
		el("SolidColor", { colorValue: color, name: "Color" }, bind(p, K.color)),
	);
const stroke = (thickness: number, color: string, rigid?: boolean) =>
	el(
		"Stroke",
		{
			thickness,
			cap: "round",
			join: "round",
			transformAffectsStroke: rigid ? false : undefined,
			name: "Stroke",
		},
		el("SolidColor", { colorValue: color, name: "Color" }),
	);
const strokeBound = (
	thickness: number,
	p: string,
	color: string,
	rigid?: boolean,
) =>
	el(
		"Stroke",
		// `rigid`: keeps its thickness when its shape is squashed (by a blink).
		{
			thickness,
			cap: "round",
			join: "round",
			transformAffectsStroke: rigid ? false : undefined,
			name: "Stroke",
		},
		el("SolidColor", { colorValue: color, name: "Color" }, bind(p, K.color)),
	);
const clip = (sourceId: string) =>
	el("ClippingShape", { sourceId, name: "Clip" });

// ── geometry of a pose ──────────────────────────────────────────────────────
// Everything an animation can set, as [object id, property key, value].
type Key = [string, number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** An eye's shapes for a pose: the ellipse, the lid line and the cheek, around the eye's centre. */
function eyeGeometry(p: Pose, side: number) {
	const rx = lerp(EYES.shut.rx, EYES.eye.rx * p.size, p.open);
	const ry = lerp(EYES.shut.ry, EYES.eye.ry * p.size, p.open);
	const y0 = EYES.shut.drop * (1 - p.open); // the shut eye sits lower
	const W = EYES.eye.rx * 1.3 + 2; // the aperture reaches past the widest eye
	// The upper lid: a straight line, slanting with `tilt`, lowered by `lid`. Out of the way, it sits above the eye.
	let [yl, yr] = [y0 - ry - 2, y0 - ry - 2];
	let lidLow = -ry; // the lid's lowest point inside the eye
	if (p.lid >= 0.005) {
		const drop = Math.min(p.lid, 0.995) * 2 * ry - ry;
		const slope = -side * p.tilt * Math.min(1, p.lid / 0.1);
		[yl, yr] = [y0 + drop - slope * W, y0 + drop + slope * W];
		// Where the line cuts the ellipse, to keep the cheek below it.
		const [qa, qb, qc] = [
			1 / rx ** 2 + slope ** 2 / ry ** 2,
			(2 * drop * slope) / ry ** 2,
			drop ** 2 / ry ** 2 - 1,
		];
		const root = Math.sqrt(Math.max(0, qb ** 2 - 4 * qa * qc));
		lidLow = Math.max(
			...[(-qb - root) / (2 * qa), (-qb + root) / (2 * qa)].map(
				(x) => drop + slope * x,
			),
		);
	}
	// The cheek: a cut across the bottom that bows upward in the middle. Out of the way, it sits below the eye.
	let [yb, hb, bow] = [y0 + ry + 2, rx * 0.5, 0];
	if (p.cheek >= 0.005) {
		const bottom = Math.max(lidLow + 0.4, ry * (1 - 0.9 * p.cheek));
		hb = rx * Math.sqrt(Math.max(0, 1 - (bottom / ry) ** 2));
		yb = y0 + bottom;
		bow = p.cheek * ry * 0.5;
	}
	return { rx, ry, y0, W, yl, yr, yb, hb, bow };
}

// ── the scene ───────────────────────────────────────────────────────────────
type EyeIds = ReturnType<typeof eyeIds>;
const eyeIds = () => ({
	node: id(),
	blink: id(), // squashes the eye shut, whatever face it is wearing
	shadowBlink: id(),
	lidLine: [id(), id()],
	cheekLine: [id(), id()],
	ballLine: [id(), id()], // shape, ellipse
	ballFill: [id(), id()],
	lidClip: [id(), id()],
	aperture: [id(), [id(), id(), id(), id(), id(), id()]] as const,
	gaze: id(),
	cross: id(), // this eye's own pupil, off where the pair is looking (cross-eyed)
	dizzy: id(),
	iris: id(),
	pupil: id(),
	spiral: id(),
	spin: id(),
	shadow: id(),
	shadowBall: [id(), id()],
	shadowAperture: [id(), [id(), id(), id(), id(), id(), id()]] as const,
});
const eyes = EYES.at.map(() => eyeIds());
const mouth = { shape: id(), l: id(), r: id() };
const tongue = { node: id(), rect: id(), groove: id() };
const body = id();
const head = id();
const breath = id();
const pop = id(); // squashes and stretches from the chin
const CHIN = rel(29);

/** The six points of an aperture: lid (two), right side, the cheek (two, curved), left side. */
function apertureKeys(
	vs: readonly string[],
	g: ReturnType<typeof eyeGeometry>,
	grow: number,
): Key[] {
	const [tl, tr, br, cr, cl, bl] = vs;
	const [hx, hy] = [(g.hb * 2) / 3, (g.bow * 2) / 3]; // the cheek's quadratic curve, as a cubic
	const handle = Math.hypot(hx, hy);
	return [
		[tl, K.vx, -g.W],
		[tl, K.vy, g.yl - grow],
		[tr, K.vx, g.W],
		[tr, K.vy, g.yr - grow],
		[br, K.vx, g.W],
		[br, K.vy, g.yb + grow],
		[cr, K.vx, g.hb],
		[cr, K.vy, g.yb + grow],
		[cr, K.outRot, hy ? Math.atan2(-hy, -hx) : -Math.PI],
		[cr, K.outDist, handle],
		[cl, K.vx, -g.hb],
		[cl, K.vy, g.yb + grow],
		[cl, K.inRot, hy ? Math.atan2(-hy, hx) : 0],
		[cl, K.inDist, handle],
		[bl, K.vx, -g.W],
		[bl, K.vy, g.yb + grow],
	];
}
const sized = (
	ids: string[],
	rx: number,
	ry: number,
	y: number,
	grow = 0,
): Key[] => [
	[ids[0], K.y, y * S],
	[ids[1], K.width, (rx * 2 + grow) * S],
	[ids[1], K.height, (ry * 2 + grow) * S],
];
const scaled = (keys: Key[]): Key[] =>
	keys.map(([o, k, v]) => [o, k, k === K.vx || k === K.vy ? v * S : v]);

function eyeKeys(p: Pose): Key[] {
	return eyes.flatMap((e, i) => {
		const g = eyeGeometry(eyePose(p, i), i ? 1 : -1);
		const [lt, lr] = e.lidLine;
		const [ct, cr] = e.cheekLine;
		const ap = apertureKeys(e.aperture[1], g, 0);
		return [
			...sized(e.ballLine, g.rx, g.ry, g.y0),
			...sized(e.ballFill, g.rx, g.ry, g.y0),
			...sized(e.lidClip, g.rx, g.ry, g.y0, 1.3),
			...sized(e.shadowBall, g.rx, g.ry, g.y0),
			...scaled(ap),
			...scaled(apertureKeys(e.shadowAperture[1], g, 0.65)),
			// The lid's and the cheek's own lines follow the aperture's edges.
			...scaled([
				[lt, K.vx, -g.W],
				[lt, K.vy, g.yl],
				[lr, K.vx, g.W],
				[lr, K.vy, g.yr],
			]),
			...scaled(
				ap
					.filter(([o]) => o === e.aperture[1][3] || o === e.aperture[1][4])
					.map(([o, k, v]): Key => [o === e.aperture[1][3] ? ct : cr, k, v]),
			),
		];
	});
}

function mouthKeys({ mouth: m }: Pose): Key[] {
	// Two curves between the corners: over the top, then back along the bottom. A slant lifts
	// one corner, so each corner's handles reach a different height to the same middle.
	const [[lx, ly], [rx, ry]] = corners(m);
	const half = (m.slant ?? 0) / 2;
	const [upL, downL, upR, downR] = [
		m.upper - half,
		m.lower - half,
		m.upper + half,
		m.lower + half,
	];
	// Angles are kept on one side of the turn so a change of face swings the handles the short way round.
	const right = (dy: number) => {
		const a = Math.atan2(dy, -m.inset);
		return a < 0 ? a + 2 * Math.PI : a;
	};
	return [
		[mouth.l, K.vx, rel(lx)],
		[mouth.l, K.vy, rel(ly)],
		[mouth.l, K.outRot, Math.atan2(upL, m.inset)],
		[mouth.l, K.outDist, Math.hypot(m.inset, upL) * S],
		[mouth.l, K.inRot, Math.atan2(downL, m.inset)],
		[mouth.l, K.inDist, Math.hypot(m.inset, downL) * S],
		[mouth.r, K.vx, rel(rx)],
		[mouth.r, K.vy, rel(ry)],
		[mouth.r, K.inRot, right(upR)],
		[mouth.r, K.inDist, Math.hypot(m.inset, upR) * S],
		[mouth.r, K.outRot, right(downR)],
		[mouth.r, K.outDist, Math.hypot(m.inset, downR) * S],
	];
}

// The tongue: out and tilted on the faces that show it; otherwise drawn up into the mouth and gone.
const TONGUE_IN = { dx: 0, len: 0.6, w: 1.4, turn: 0 };
function tongueKeys({ mouth: m, tongue: t }: Pose): Key[] {
	const shown = t ?? TONGUE_IN;
	const { x, y } = tongueRoot(m, shown);
	return [
		[tongue.node, K.x, rel(x)],
		[tongue.node, K.y, rel(y)],
		[tongue.node, K.rotation, (shown.turn * Math.PI) / 180],
		[tongue.node, K.opacity, t ? 1 : 0],
		[tongue.rect, K.width, shown.w * 2 * S],
		[tongue.rect, K.height, shown.len * S],
		[tongue.rect, K.cornerBL, Math.min(shown.w, shown.len) * S],
		[tongue.rect, K.cornerBR, Math.min(shown.w, shown.len) * S],
		[tongue.groove, K.height, Math.max(0, shown.len - shown.w * 0.9 - 0.4) * S],
	];
}

const pupilKeys = (p: Pose): Key[] => {
	const gaze = gazeOf(p);
	return eyes.flatMap(
		(e, i) =>
			[
				[e.pupil, K.width, p.pupil.rx * 2 * S],
				[e.pupil, K.height, p.pupil.ry * 2 * S],
				[e.cross, K.x, (p.pupils[i].x - gaze.x) * S],
				[e.cross, K.y, (p.pupils[i].y - gaze.y) * S],
			] as Key[],
	);
};
const spiralKeys = (dead: boolean): Key[] =>
	eyes.flatMap(
		(e) =>
			[
				[e.spiral, K.scaleX, dead ? 1 : 0.2],
				[e.spiral, K.scaleY, dead ? 1 : 0.2],
				[e.spiral, K.opacity, dead ? 1 : 0],
			] as Key[],
	);

const faceKeys = (face: Face): Key[] => [
	...eyeKeys(poses[face]),
	...mouthKeys(poses[face]),
	...tongueKeys(poses[face]),
	...pupilKeys(poses[face]),
	...spiralKeys(face === "dead"),
];

// The shapes, drawn from the "hi" face (the first frame before the machine runs).
const hi = Object.fromEntries(
	faceKeys("hi").map(([o, k, v]) => [`${o}/${k}`, v]),
);
const v = (o: string, k: number) => hi[`${o}/${k}`] ?? 0;
const point = (tag: string, vid: string, extra: Record<string, Attr> = {}) =>
	el(tag, {
		x: v(vid, K.vx),
		y: v(vid, K.vy),
		...extra,
		name: "Point",
		id: vid,
	});
const ellipse = (
	[shape, path]: string[],
	name: string,
	paint: string[],
	clips: string[] = [],
) =>
	el(
		"Shape",
		{ y: v(shape, K.y), name, id: shape },
		el("Ellipse", {
			width: v(path, K.width),
			height: v(path, K.height),
			name: "Path",
			id: path,
		}),
		...paint,
		...clips.map(clip),
	);
const aperture = (
	[shape, vs]: readonly [string, readonly string[]],
	name: string,
) =>
	el(
		"Shape",
		{ name, id: shape },
		el(
			"PointsPath",
			{ isClosed: true, name: "Path" },
			point("StraightVertex", vs[0]),
			point("StraightVertex", vs[1]),
			point("StraightVertex", vs[2]),
			point("CubicDetachedVertex", vs[3], {
				inRotation: 0,
				inDistance: 0,
				outRotation: v(vs[3], K.outRot),
				outDistance: v(vs[3], K.outDist),
			}),
			point("CubicDetachedVertex", vs[4], {
				inRotation: v(vs[4], K.inRot),
				inDistance: v(vs[4], K.inDist),
				outRotation: 0,
				outDistance: 0,
			}),
			point("StraightVertex", vs[5]),
		),
	);

const LINE = 1.3 * S;
const eyeShapes = (e: EyeIds, i: number) =>
	el(
		"Node",
		{
			x: rel(EYES.at[i]),
			y: rel(EYES.cy),
			name: i ? "Right eye" : "Left eye",
			id: e.node,
		},
		el(
			"Node",
			{ name: "Blink", id: e.blink },
			el(
				"Shape",
				{ name: "Lid line" },
				el(
					"PointsPath",
					{ name: "Path" },
					point("StraightVertex", e.lidLine[0]),
					point("StraightVertex", e.lidLine[1]),
				),
				strokeBound(LINE, P.ink, "FF0A0A0A", true),
				clip(e.lidClip[0]),
			),
			el(
				"Shape",
				{ name: "Cheek line" },
				el(
					"PointsPath",
					{ name: "Path" },
					point("CubicDetachedVertex", e.cheekLine[0], {
						inRotation: 0,
						inDistance: 0,
						outRotation: v(e.cheekLine[0], K.outRot),
						outDistance: v(e.cheekLine[0], K.outDist),
					}),
					point("CubicDetachedVertex", e.cheekLine[1], {
						inRotation: v(e.cheekLine[1], K.inRot),
						inDistance: v(e.cheekLine[1], K.inDist),
						outRotation: 0,
						outDistance: 0,
					}),
				),
				strokeBound(LINE, P.ink, "FF0A0A0A", true),
				clip(e.lidClip[0]),
			),
			ellipse(
				e.ballLine,
				"Outline",
				[strokeBound(LINE, P.ink, "FF0A0A0A", true)],
				[e.aperture[0]],
			),
			// The pupil: placed by the gaze, circled when dizzy, opened in the dark.
			el(
				"Node",
				{
					x: gazeOf(poses.hi).x * S,
					y: gazeOf(poses.hi).y * S,
					name: "Gaze",
					id: e.gaze,
				},
				bind(P.lookX, K.x, conv.look),
				bind(P.lookY, K.y, conv.look),
				el(
					"Node",
					{
						x: v(e.cross, K.x),
						y: v(e.cross, K.y),
						name: "Own way",
						id: e.cross,
					},
					el(
						"Node",
						{ name: "Dizzy", id: e.dizzy },
						el(
							"Node",
							{ name: "Iris", id: e.iris },
							el(
								"Shape",
								{ name: "Pupil" },
								el("Ellipse", {
									width: v(e.pupil, K.width),
									height: v(e.pupil, K.height),
									name: "Path",
									id: e.pupil,
								}),
								fill(argb(COLOR.pupil)),
								clip(e.ballFill[0]),
								clip(e.aperture[0]),
							),
						),
					),
				),
			),
			ellipse(e.ballFill, "White", [fill(argb(COLOR.eye))], [e.aperture[0]]),
			aperture(e.aperture, "Aperture"),
			ellipse(e.lidClip, "Lid clip", []),
		),
	);
const shadowShapes = (e: EyeIds, i: number) =>
	el(
		"Node",
		{
			x: rel(EYES.at[i] + EYES.depth.x),
			y: rel(EYES.cy + EYES.depth.y),
			name: i ? "Right shadow" : "Left shadow",
			id: e.shadow,
		},
		el(
			"Node",
			{ name: "Blink", id: e.shadowBlink },
			ellipse(
				e.shadowBall,
				"Shadow",
				[fill(argb(COLOR.shadow)), stroke(LINE, argb(COLOR.shadow), true)],
				[e.shadowAperture[0]],
			),
			aperture(e.shadowAperture, "Aperture"),
		),
	);

// The knocked-out spiral, as a polyline.
const spiralPoints = () => {
	const end = 2 * Math.PI * SPIRAL.turns;
	const steps = Math.ceil(SPIRAL.turns * 32);
	return Array.from({ length: steps + 1 }, (_, i) => {
		const t = (end * i) / steps;
		return el("StraightVertex", {
			x: ((SPIRAL.r * t) / end) * Math.cos(t) * S,
			y: ((SPIRAL.r * t) / end) * Math.sin(t) * S,
			name: "Point",
		});
	});
};
const spiralShapes = (e: EyeIds, i: number) =>
	el(
		"Node",
		{
			x: rel(EYES.at[i]),
			y: rel(EYES.cy),
			scaleX: 0.2,
			scaleY: 0.2,
			opacity: 0,
			name: i ? "Right spiral" : "Left spiral",
			id: e.spiral,
		},
		el(
			"Node",
			{ name: "Spin", id: e.spin },
			el(
				"Shape",
				{ name: "Spiral" },
				el("PointsPath", { name: "Path" }, ...spiralPoints()),
				stroke(SPIRAL.weight * S, argb(COLOR.pupil)),
			),
		),
	);

const mouthShape = el(
	"Shape",
	{ name: "Mouth", id: mouth.shape },
	el(
		"PointsPath",
		{ isClosed: true, name: "Path" },
		...[mouth.l, mouth.r].map((vid) =>
			point("CubicDetachedVertex", vid, {
				inRotation: v(vid, K.inRot),
				inDistance: v(vid, K.inDist),
				outRotation: v(vid, K.outRot),
				outDistance: v(vid, K.outDist),
			}),
		),
	),
	strokeBound(1.5 * S, P.ink, "FF0A0A0A"),
);

// Hangs from the top of its node (the middle of the mouth), behind the mouth's line.
const tongueShape = el(
	"Node",
	{
		x: v(tongue.node, K.x),
		y: v(tongue.node, K.y),
		opacity: 0,
		name: "Tongue",
		id: tongue.node,
	},
	el(
		"Shape",
		{ name: "Groove" },
		el("Rectangle", {
			y: 0.4 * S,
			originY: 0,
			width: 0.5 * S,
			height: v(tongue.groove, K.height),
			cornerRadiusTL: 0.25 * S,
			name: "Path",
			id: tongue.groove,
		}),
		fillBound(P.ink3, "FF999999"),
	),
	el(
		"Shape",
		{ name: "Tongue" },
		el("Rectangle", {
			originY: 0,
			width: v(tongue.rect, K.width),
			height: v(tongue.rect, K.height),
			linkCornerRadius: false,
			cornerRadiusBL: v(tongue.rect, K.cornerBL),
			cornerRadiusBR: v(tongue.rect, K.cornerBR),
			name: "Path",
			id: tongue.rect,
		}),
		fill(argb(COLOR.tongue)),
		strokeBound(1.1 * S, P.ink, "FF0A0A0A"),
	),
);

// ── particles ───────────────────────────────────────────────────────────────
// Bursts of sparks, each its own fixed scatter swung a little its own way. Several, so they
// can overlap: each angry poke throws a fresh one while the last are still flying.
const rng = (() => {
	let seed = 7;
	return (min: number, max: number) => {
		seed = (seed * 16807) % 2147483647;
		return min + ((seed - 1) / 2147483646) * (max - min);
	};
})();
const R = 16 * S; // the mascot's half-width
const BURSTS = 4;
const bursts = Array.from({ length: BURSTS }, (_, n) => ({
	node: id(),
	trigger: [P.spark1, P.spark2, P.spark3, P.spark4][n],
	turn: rng(-0.4, 0.4),
	sparks: Array.from({ length: 8 }, (_, i) => {
		const way = -Math.PI + ((i + 0.5) / 8) * Math.PI + rng(-0.25, 0.25); // upward and outward
		const [far, turn, size, ms] = [
			R * rng(1.3, 2.4),
			rng(-2.4, 2.4),
			6.4 * S * rng(0.6, 1.2),
			rng(360, 680),
		];
		return {
			id: id(),
			way,
			far,
			turn,
			size,
			frames: Math.round((ms / 1000) * 60),
		};
	}),
}));
const sparkShapes = bursts.map((burst, n) =>
	el(
		"Node",
		{
			x: at(16),
			y: at(12.8),
			rotation: burst.turn,
			name: `Sparks ${n + 1}`,
			id: burst.node,
		},
		...burst.sparks.map((s) =>
			el(
				"Shape",
				{
					x: Math.cos(s.way) * R * 0.8,
					y: Math.sin(s.way) * R * 0.8,
					opacity: 0,
					name: "Spark",
					id: s.id,
				},
				el("Star", {
					points: 4,
					innerRadius: 0.34,
					width: s.size,
					height: s.size,
					name: "Path",
				}),
				fill(argb(COLOR.rage)),
			),
		),
	),
);

const UI = 32 / 40; // a poke line's unit, in face units (a 40th of the mascot)
const IMPACT = { lines: 6, from: 9 * UI * S, to: 20 * UI * S, frames: 18 };
const impactLines = Array.from({ length: IMPACT.lines }, () => ({
	node: id(),
	shape: id(),
}));
const impactShapes = el(
	"Node",
	{ x: at(16), y: at(16), name: "Poke", id: id() },
	bind(P.pokeX, K.x, conv.poke),
	bind(P.pokeY, K.y, conv.poke),
	el("DataBindContext", {
		sourcePathIds: `${VM}-${P.impactTurn}`,
		propertyKey: K.rotation,
	}),
	...impactLines.map((l, i) =>
		el(
			"Node",
			{ rotation: (i / IMPACT.lines) * Math.PI * 2, name: "Way", id: l.node },
			el(
				"Shape",
				{ x: IMPACT.from, opacity: 0, name: "Line", id: l.shape },
				el("Rectangle", {
					width: 5 * UI * S,
					height: 1.6 * UI * S,
					cornerRadiusTL: 0.8 * UI * S,
					name: "Path",
				}),
				fillBound(P.impactColor, "FF787878"),
			),
		),
	),
);

// Two z's, a big one and a small one, drifting up in turn.
const zs = [
	{ id: id(), x: 0.8, size: 0.34, dx: 0.45, dy: -0.95, turn: 0.2, from: 0 },
	{ id: id(), x: 0.62, size: 0.24, dx: 0.3, dy: -0.85, turn: -0.15, from: 102 },
].map((z) => ({ ...z, em: z.size * 32 * S }));
const Z_LIFE = 102; // frames each z is up (1.7 s); together they loop every 3.4 s
const zShapes = zs.map((z) => {
	const a = z.em * 0.26;
	return el(
		"Shape",
		{ x: at(32 * z.x), y: at(32 * 0.15), opacity: 0, name: "Z", id: z.id },
		el(
			"PointsPath",
			{ name: "Path" },
			...[
				[-a, -a],
				[a, -a],
				[-a, a],
				[a, a],
			].map(([x, y]) => el("StraightVertex", { x, y, name: "Point" })),
		),
		strokeBound(z.em * 0.12, P.ink3, "FF999999"),
	);
});

// Two notes drifting up off to the right of a whistling mouth, in turn.
const notes = [
	{
		id: id(),
		x: 0.66,
		y: 0.74,
		size: 1,
		dx: 0.32,
		dy: -0.5,
		turn: 0.25,
		from: 0,
	},
	{
		id: id(),
		x: 0.7,
		y: 0.7,
		size: 0.75,
		dx: 0.42,
		dy: -0.36,
		turn: -0.2,
		from: 51,
	},
];
const NOTE_LIFE = 51; // frames each note is up; together they loop every 1.7 s
const noteShapes = notes.map((note) => {
	const u = note.size * 1.3 * S; // a note's unit
	return el(
		"Node",
		{
			x: at(32 * note.x),
			y: at(32 * note.y),
			opacity: 0,
			name: "Note",
			id: note.id,
		},
		el(
			"Shape",
			{ name: "Note" },
			el("Ellipse", {
				x: -0.75 * u,
				rotation: -0.35,
				width: 2 * u,
				height: 1.5 * u,
				name: "Head",
			}),
			el("Rectangle", {
				x: 0.05 * u,
				y: -1.9 * u,
				width: 0.45 * u,
				height: 3.8 * u,
				name: "Stem",
			}),
			el("Rectangle", {
				x: 0.85 * u,
				y: -3.4 * u,
				rotation: 0.5,
				width: 1.8 * u,
				height: 0.5 * u,
				name: "Flag",
			}),
			fillBound(P.ink3, "FF999999"),
		),
	);
});

// ── animations ──────────────────────────────────────────────────────────────
type Frame = {
	frame: number;
	value: number;
	ease?: [number, number, number, number] | "linear" | "hold";
};
const keyframes = (tracks: Map<string, Frame[]>) =>
	[...tracks]
		.reduce((byObject, [key, frames]) => {
			const [o, k] = key.split("/");
			(byObject.get(o) ?? byObject.set(o, []).get(o)!).push([
				Number(k),
				frames,
			]);
			return byObject;
		}, new Map<string, [number, Frame[]][]>())
		.entries()
		.map(([o, list]) =>
			el(
				"KeyedObject",
				{ objectId: o },
				...list.map(([k, frames]) =>
					el(
						"KeyedProperty",
						{ propertyKey: k },
						...frames.map((f) =>
							Array.isArray(f.ease)
								? el(
										"KeyFrameDouble",
										{
											value: f.value,
											frame: f.frame,
											interpolationType: "cubic",
										},
										ease(...f.ease),
									)
								: el("KeyFrameDouble", {
										value: f.value,
										frame: f.frame,
										interpolationType: f.ease ?? "linear",
									}),
						),
					),
				),
			),
		)
		.toArray();
const track = () => new Map<string, Frame[]>();
const put = (
	t: Map<string, Frame[]>,
	o: string,
	k: number,
	...frames: Frame[]
) => t.set(`${o}/${k}`, [...(t.get(`${o}/${k}`) ?? []), ...frames]);
const pose = (keys: Key[]) => {
	const t = track();
	for (const [o, k, value] of keys) put(t, o, k, { frame: 0, value });
	return t;
};
const animations: string[] = [];
const animation = (
	name: string,
	t: Map<string, Frame[]>,
	duration = 1,
	loop = "oneShot",
) => {
	const aid = id();
	animations.push(
		el(
			"LinearAnimation",
			{ loopValue: loop, duration, name, id: aid },
			...keyframes(t),
		),
	);
	return aid;
};
const EASE_IN_OUT: [number, number, number, number] = [0.42, 0, 0.58, 1];
const FLING: [number, number, number, number] = [0.2, 0.7, 0.3, 1];
const frames = (ms: number) => Math.round((ms / 1000) * 60);

const rest = animation("Rest", track());
const faceAnim = Object.fromEntries(
	FACES.map((f) => [f, animation(`Face: ${f}`, pose(faceKeys(f)))]),
) as Record<Face, string>;
// A blink squashes each eye (and its shadow) to the shut eye's height and drops it a little.
// Open and shut both key the same values, so the state machine blends between them both ways.
const lids = (scale: number, drop: number) =>
	pose(
		eyes.flatMap((e) =>
			[e.blink, e.shadowBlink].flatMap((o): Key[] => [
				[o, K.scaleY, scale],
				[o, K.y, drop * S],
			]),
		),
	);
const openAnim = animation("Eyes open", lids(1, 0));
const shutAnim = animation(
	"Eyes shut",
	lids(EYES.shut.ry / EYES.eye.ry, EYES.shut.drop),
);

const irisTrack = (...frames: Frame[]) => {
	const t = track();
	for (const e of eyes)
		for (const k of [K.scaleX, K.scaleY]) put(t, e.iris, k, ...frames);
	return t;
};
const DARK = 1.18;
const lit = animation("Light", irisTrack({ frame: 0, value: 1 }));
const dark = animation("Dark", irisTrack({ frame: 0, value: DARK }));
// Lights on: the pupils clamp down past their size, then ease back. Lights off: they open wide, then settle.
const toLit = animation(
	"Lights on",
	irisTrack(
		{ frame: 0, value: DARK, ease: [0.2, 0.8, 0.3, 1] },
		{ frame: 6, value: 0.75, ease: [0.4, 0, 0.3, 1] },
		{ frame: 48, value: 1 },
	),
	48,
);
const toDark = animation(
	"Lights off",
	irisTrack(
		{ frame: 0, value: 1, ease: [0.3, 0.6, 0.3, 1] },
		{ frame: 24, value: DARK * 1.2, ease: EASE_IN_OUT },
		{ frame: 66, value: DARK },
	),
	66,
);

// Dizzy: the pupils go round, the two a little out of step.
const DIZZY_TURN = 25; // frames a turn (2.4 a second)
const dizzyTrack = track();
eyes.forEach((e, i) => {
	for (let f = 0; f <= DIZZY_TURN; f += DIZZY_TURN / 12) {
		const turn = (f / DIZZY_TURN) * Math.PI * 2 - i * 0.9;
		put(dizzyTrack, e.dizzy, K.x, {
			frame: Math.round(f * 10) / 10,
			value: Math.cos(turn) * EYES.reach.x * 0.8 * S,
		});
		put(dizzyTrack, e.dizzy, K.y, {
			frame: Math.round(f * 10) / 10,
			value: Math.sin(turn) * EYES.reach.y * 0.6 * S,
		});
	}
});
const dizzy = animation("Dizzy", dizzyTrack, DIZZY_TURN, "loop");
const steady = animation(
	"Steady",
	pose(
		eyes.flatMap((e): Key[] => [
			[e.dizzy, K.x, 0],
			[e.dizzy, K.y, 0],
		]),
	),
);

const spinTrack = track();
for (const e of eyes)
	put(
		spinTrack,
		e.spin,
		K.rotation,
		{ frame: 0, value: 0 },
		{ frame: 66, value: -Math.PI * 2 },
	);
const spin = animation("Spin", spinTrack, 66, "loop");

const breathTrack = track();
put(
	breathTrack,
	breath,
	K.y,
	{ frame: 0, value: 0, ease: EASE_IN_OUT },
	{ frame: 126, value: 0.3 * S },
);
const breathe = animation("Breathe", breathTrack, 126, "pingPong");

// A poke: squashed, then springing back with a wobble.
const wiggleTrack = track();
const WIGGLE = frames(420);
const deg = (d: number) => (d * Math.PI) / 180;
for (const [share, scale, rot] of [
	[0, 1, 0],
	[0.12, 0.86, -4],
	[0.3, 1.08, -9],
	[0.5, 0.98, 7],
	[0.72, 1.01, -4],
	[1, 1, 0],
]) {
	const frame = Math.round(share * WIGGLE);
	put(wiggleTrack, body, K.scaleX, { frame, value: scale, ease: EASE_IN_OUT });
	put(wiggleTrack, body, K.scaleY, { frame, value: scale, ease: EASE_IN_OUT });
	put(wiggleTrack, body, K.rotation, {
		frame,
		value: deg(rot),
		ease: EASE_IN_OUT,
	});
}
const wiggle = animation("Wiggle", wiggleTrack, WIGGLE);

// Fury: a hard shake.
const rageTrack = track();
const RAGE = frames(380);
const SHAKE = 0.9 * S;
for (const [share, x, y, rot] of [
	[0, 0, 0, 0],
	[0.1, -1, 0.33, -3],
	[0.25, 1, -0.33, 3],
	[0.4, -1, -0.33, -2],
	[0.55, 1, 0.33, 2],
	[0.7, -0.66, 0, -1],
	[0.85, 0.66, 0, 1],
	[1, 0, 0, 0],
]) {
	const frame = Math.round(share * RAGE);
	put(rageTrack, body, K.x, { frame, value: SIZE / 2 + x * SHAKE });
	put(rageTrack, body, K.y, { frame, value: SIZE / 2 + y * SHAKE });
	put(rageTrack, body, K.rotation, { frame, value: deg(rot) });
}
const rage = animation("Rage", rageTrack, RAGE);

const sparkAnims = bursts.map((burst, n) => {
	const sparkTrack = track();
	for (const s of burst.sparks) {
		const [x0, y0] = [Math.cos(s.way) * R * 0.8, Math.sin(s.way) * R * 0.8];
		put(
			sparkTrack,
			s.id,
			K.x,
			{ frame: 0, value: x0, ease: FLING },
			{ frame: s.frames, value: x0 + Math.cos(s.way) * s.far },
		);
		put(
			sparkTrack,
			s.id,
			K.y,
			{ frame: 0, value: y0, ease: FLING },
			{ frame: s.frames, value: y0 + Math.sin(s.way) * s.far },
		);
		put(
			sparkTrack,
			s.id,
			K.rotation,
			{ frame: 0, value: 0, ease: FLING },
			{ frame: s.frames, value: s.turn },
		);
		for (const k of [K.scaleX, K.scaleY])
			put(
				sparkTrack,
				s.id,
				k,
				{ frame: 0, value: 0.3, ease: FLING },
				{ frame: s.frames, value: 1 },
			);
		put(
			sparkTrack,
			s.id,
			K.opacity,
			{ frame: 0, value: 1 },
			{ frame: Math.round(s.frames * 0.6), value: 1 },
			{ frame: s.frames, value: 0 },
		);
	}
	return animation(
		`Sparks ${n + 1}`,
		sparkTrack,
		Math.max(...burst.sparks.map((s) => s.frames)),
	);
});

const impactTrack = track();
for (const l of impactLines) {
	put(
		impactTrack,
		l.shape,
		K.x,
		{ frame: 0, value: IMPACT.from, ease: FLING },
		{ frame: IMPACT.frames, value: IMPACT.to },
	);
	put(
		impactTrack,
		l.shape,
		K.scaleX,
		{ frame: 0, value: 0.4, ease: FLING },
		{ frame: IMPACT.frames, value: 1 },
	);
	put(
		impactTrack,
		l.shape,
		K.opacity,
		{ frame: 0, value: 1 },
		{ frame: IMPACT.frames / 2, value: 1 },
		{ frame: IMPACT.frames, value: 0 },
	);
}
const impactAnim = animation("Poke lines", impactTrack, IMPACT.frames);

const zTrack = track();
for (const z of zs) {
	const [x, y] = [at(32 * z.x), at(32 * 0.15)];
	const life = (share: number) => z.from + Math.round(share * Z_LIFE);
	const before = z.from ? [{ frame: 0, value: 0, ease: "hold" as const }] : [];
	put(
		zTrack,
		z.id,
		K.opacity,
		...before,
		{ frame: life(0), value: 0 },
		{ frame: life(0.25), value: 1 },
		{ frame: life(1), value: 0 },
	);
	put(
		zTrack,
		z.id,
		K.x,
		{ frame: life(0), value: x, ease: [0, 0, 0.58, 1] },
		{ frame: life(1), value: x + z.dx * 32 * S },
	);
	put(
		zTrack,
		z.id,
		K.y,
		{ frame: life(0), value: y, ease: [0, 0, 0.58, 1] },
		{ frame: life(1), value: y + z.dy * 32 * S },
	);
	put(
		zTrack,
		z.id,
		K.rotation,
		{ frame: life(0), value: 0, ease: [0, 0, 0.58, 1] },
		{ frame: life(1), value: z.turn },
	);
	for (const k of [K.scaleX, K.scaleY])
		put(
			zTrack,
			z.id,
			k,
			{ frame: life(0), value: 0.5, ease: [0, 0, 0.58, 1] },
			{ frame: life(1), value: 1 },
		);
}
const zsAnim = animation("Z's", zTrack, Z_LIFE * 2, "loop");

const noteTrack = track();
for (const note of notes) {
	const [x, y] = [at(32 * note.x), at(32 * note.y)];
	const life = (share: number) => note.from + Math.round(share * NOTE_LIFE);
	const before = note.from
		? [{ frame: 0, value: 0, ease: "hold" as const }]
		: [];
	const drift: [number, number, number][] = [
		[K.x, x, x + note.dx * 32 * S],
		[K.y, y, y + note.dy * 32 * S],
		[K.rotation, 0, note.turn],
		[K.scaleX, 0.5, 1],
		[K.scaleY, 0.5, 1],
	];
	put(
		noteTrack,
		note.id,
		K.opacity,
		...before,
		{ frame: life(0), value: 0 },
		{ frame: life(0.2), value: 1 },
		{ frame: life(1), value: 0 },
	);
	for (const [k, from, to] of drift)
		put(
			noteTrack,
			note.id,
			k,
			{ frame: life(0), value: from, ease: [0, 0, 0.58, 1] },
			{ frame: life(1), value: to },
		);
}
const notesAnim = animation("Notes", noteTrack, NOTE_LIFE * 2, "loop");
const noNotes = animation(
	"No notes",
	pose(notes.map((note): Key => [note.id, K.opacity, 0])),
);
const noZs = animation(
	"No z's",
	pose(zs.map((z): Key => [z.id, K.opacity, 0])),
);

// Squash and stretch, from the chin. A pop on every change of face; a hop for a big surprise.
const bounce = (name: string, keys: [number, number, number, number][]) => {
	const t = track();
	for (const [frame, sx, sy, up] of keys) {
		put(t, pop, K.scaleX, { frame, value: sx, ease: EASE_IN_OUT });
		put(t, pop, K.scaleY, { frame, value: sy, ease: EASE_IN_OUT });
		put(t, pop, K.y, {
			frame,
			value: CHIN - up * S,
			ease: up ? [0.3, 0, 0.7, 1] : [0.2, 0.6, 0.4, 1],
		});
	}
	return animation(name, t, keys.at(-1)![0]);
};
const restPop = bounce("Upright", [[0, 1, 1, 0]]);
const popAnim = bounce("Pop", [
	[0, 1, 1, 0],
	[4, 1.07, 0.92, 0],
	[10, 0.96, 1.06, 0],
	[16, 1.02, 0.98, 0],
	[22, 1, 1, 0],
]);
const hopAnim = bounce("Hop", [
	[0, 1, 1, 0],
	[5, 1.12, 0.86, 0], // crouch
	[9, 0.9, 1.12, 2], // spring up, stretched
	[15, 1, 1, 4.5], // the top
	[21, 0.94, 1.07, 0.6], // falling
	[24, 1.12, 0.88, 0], // landing, squashed
	[30, 0.97, 1.04, 0],
	[36, 1, 1, 0],
]);

// ── the state machine ───────────────────────────────────────────────────────
const condition = (left: string, right: string) =>
	el(
		"TransitionViewModelCondition",
		{},
		el("TransitionPropertyViewModelComparator", {}, left),
		right,
	);
const when = {
	is: (p: string, value: boolean) =>
		condition(
			el("BindablePropertyBoolean", {}, bind(p, 634)),
			el("TransitionValueBooleanComparator", { value }),
		),
	face: (f: Face) =>
		condition(
			el("BindablePropertyEnum", {}, bind(P.face, 637)),
			el("TransitionValueEnumComparator", { value: faceValue[f] }),
		),
	fired: (p: string) =>
		condition(
			el("BindablePropertyTrigger", {}, bind(p, 686)),
			el("TransitionValueTriggerComparator", {}),
		),
};
type Go = {
	to: string;
	ms?: number;
	ease?: [number, number, number, number];
	if?: string;
	atEnd?: boolean;
};
const go = ({ to, ms = 0, ease: e, if: cond, atEnd }: Go) =>
	el(
		"StateTransition",
		{
			stateToId: to,
			duration: ms || undefined,
			interpolationType: e ? "cubic" : undefined,
			enableExitTime: atEnd || undefined,
			exitTimeIsPercetange: atEnd || undefined,
			exitTime: atEnd ? 100 : undefined,
		},
		e && ease(...e),
		cond,
	);
type State = { id: string; anim: string; out: Go[]; reset?: boolean };
const layer = (name: string, entry: Go[], states: State[]) =>
	el(
		"StateMachineLayer",
		{ name, id: id() },
		el("AnyState", { x: 0, y: -160 }),
		el("ExitState", { x: 200, y: -160 }),
		el("EntryState", { x: -200, y: 0 }, ...entry.map(go)),
		...states.map((s, i) =>
			el(
				"AnimationState",
				{
					x: 160 + (i % 5) * 200,
					y: Math.floor(i / 5) * 120,
					animationId: s.anim,
					reset: s.reset || undefined,
					id: s.id,
				},
				...s.out.map(go),
			),
		),
	);
const state = (anim: string, out: Go[] = [], reset = false): State => ({
	id: id(),
	anim,
	out,
	reset,
});

const FACE_EASE: [number, number, number, number] = [0.25, 0.6, 0.3, 1];
const faceState = Object.fromEntries(
	FACES.map((f) => [f, state(faceAnim[f])]),
) as Record<Face, State>;
for (const f of FACES)
	faceState[f].out = FACES.filter((g) => g !== f).map((g) => ({
		to: faceState[g].id,
		ms: 220,
		ease: FACE_EASE,
		if: when.face(g),
	}));

// A lid drops fast and lifts more slowly.
const open = state(openAnim);
const shut = state(shutAnim, [
	{
		to: open.id,
		ms: 150,
		ease: [0.2, 0.6, 0.35, 1],
		if: when.is(P.shut, false),
	},
]);
open.out = [
	{ to: shut.id, ms: 70, ease: [0.55, 0, 0.8, 0.5], if: when.is(P.shut, true) },
];

const litState = state(lit);
const darkState = state(dark);
const toLitState = state(toLit, [], true);
const toDarkState = state(toDark, [], true);
for (const s of [litState, toLitState])
	s.out = [{ to: toDarkState.id, ms: 60, if: when.is(P.dark, true) }];
for (const s of [darkState, toDarkState])
	s.out = [{ to: toLitState.id, ms: 60, if: when.is(P.dark, false) }];

const still = state(steady);
const whirl = state(dizzy, [
	{ to: still.id, ms: 500, ease: EASE_IN_OUT, if: when.is(P.dizzy, false) },
]);
still.out = [{ to: whirl.id, ms: 200, if: when.is(P.dizzy, true) }];

// A one-off animation that a trigger starts, and starts over if fired again while it plays
// (two states playing it, so each can go to the other). Blended over `mix` ms when it restarts.
const STARTS_OVER = 50;
const again = (anim: string) => [state(anim, [], true), state(anim, [], true)];
const startOver = (
	[a, b]: State[],
	trigger: string,
	after: Go[],
	mix = STARTS_OVER,
) => {
	a.out = [{ to: b.id, ms: mix, if: when.fired(trigger) }, ...after];
	b.out = [{ to: a.id, ms: mix, if: when.fired(trigger) }, ...after];
};

// A poke jolts it; fury shakes it, and outranks a poke (an angry poke fires both).
const calm = state(rest);
const jolts = again(wiggle);
const furies = again(rage);
const toFury: Go = {
	to: furies[0].id,
	ms: STARTS_OVER,
	if: when.fired(P.rage),
};
const toJolt: Go = {
	to: jolts[0].id,
	ms: STARTS_OVER,
	if: when.fired(P.wiggle),
};
calm.out = [toFury, toJolt];
startOver(jolts, P.wiggle, [toFury, { to: calm.id, atEnd: true }]);
startOver(furies, P.rage, [toJolt, { to: calm.id, atEnd: true }]);

// Each burst of sparks plays out whole; the page fires the next burst's trigger.
const sparkLayers = bursts.map((burst, n) => {
	const none = state(rest);
	const flying = state(sparkAnims[n], [{ to: none.id, atEnd: true }], true);
	none.out = [{ to: flying.id, if: when.fired(burst.trigger) }];
	return layer(`Sparks ${n + 1}`, [{ to: none.id }], [none, flying]);
});

const noLines = state(rest);
const lines = again(impactAnim);
noLines.out = [{ to: lines[0].id, if: when.fired(P.impact) }];
startOver(lines, P.impact, [{ to: noLines.id, atEnd: true }], 0);

const awake = state(noZs);
const snoring = state(
	zsAnim,
	[{ to: awake.id, ms: 300, if: when.is(P.asleep, false) }],
	true,
);
awake.out = [{ to: snoring.id, if: when.is(P.asleep, true) }];

const quiet = state(noNotes);
const whistling = state(
	notesAnim,
	[{ to: quiet.id, ms: 200, if: when.is(P.whistle, false) }],
	true,
);
quiet.out = [{ to: whistling.id, if: when.is(P.whistle, true) }];

const upright = state(restPop);
const pops = again(popAnim);
const hopping = state(hopAnim, [], true);
upright.out = [
	{ to: hopping.id, if: when.fired(P.hop) },
	{ to: pops[0].id, if: when.fired(P.pop) },
];
startOver(pops, P.pop, [
	{ to: hopping.id, if: when.fired(P.hop) },
	{ to: upright.id, atEnd: true },
]);
hopping.out = [{ to: upright.id, atEnd: true }];

const machine = id();
// Layers that only ever loop.
const loopLayer = (name: string, anim: string) => {
	const s = state(anim);
	return layer(name, [{ to: s.id }], [s]);
};
const machineXml = el(
	"StateMachine",
	{ name: "Mascot", id: machine },
	layer(
		"Face",
		[{ to: faceState.hi.id }],
		FACES.map((f) => faceState[f]),
	),
	layer("Blink", [{ to: open.id }], [open, shut]), // after Face, so a blink wins over the face's eyes
	layer(
		"Light",
		[{ to: darkState.id, if: when.is(P.dark, true) }, { to: litState.id }],
		[litState, darkState, toLitState, toDarkState],
	),
	layer("Dizzy", [{ to: still.id }], [still, whirl]),
	loopLayer("Spin", spin),
	loopLayer("Breathe", breathe),
	layer("Jolt", [{ to: calm.id }], [calm, ...jolts, ...furies]),
	...sparkLayers,
	layer("Poke lines", [{ to: noLines.id }], [noLines, ...lines]),
	layer("Sleep", [{ to: awake.id }], [awake, snoring]),
	layer("Whistle", [{ to: quiet.id }], [quiet, whistling]),
	layer("Bounce", [{ to: upright.id }], [upright, ...pops, hopping]),
);

// ── the file ────────────────────────────────────────────────────────────────
const artStyle = id();
const scene = el(
	"Rive",
	{ version: 1, kind: "fragment" },
	el(
		"Artboard",
		{
			viewModelId: VM,
			viewModelInstanceId: VMI,
			defaultStateMachineId: machine,
			styleId: artStyle,
			width: SIZE,
			height: SIZE,
			name: "Mascot",
			id: id(),
		},
		el("LayoutComponentStyle", { name: "Artboard Style", id: artStyle }),
		impactShapes,
		...sparkShapes,
		...zShapes,
		...noteShapes,
		el(
			"Node",
			{ x: SIZE / 2, y: SIZE / 2, name: "Body", id: body },
			el(
				"Node",
				{ name: "Head", id: head },
				bind(P.headX, K.x, conv.head),
				bind(P.headY, K.y, conv.head),
				el(
					"Node",
					{ y: CHIN, name: "Pop", id: pop },
					el(
						"Node",
						{ y: -CHIN, name: "Offset" },
						el(
							"Node",
							{ name: "Breath", id: breath },
							mouthShape,
							tongueShape,
							...eyes.map(spiralShapes),
							...eyes.map(eyeShapes),
							...eyes.map(shadowShapes),
						),
					),
				),
			),
		),
		machineXml,
		...animations,
	),
	el(
		"DataEnumCustom",
		{ name: "Face", id: faceEnum },
		...FACES.map((f) =>
			el("DataEnumValue", { key: f, value: f, id: faceValue[f] }),
		),
	),
	el(
		"ViewModel",
		{ defaultInstanceId: VMI, name: "Mascot", id: VM },
		...Object.entries(props).map(([name, p]) =>
			el(`ViewModelProperty${p.kind}`, {
				enumId: p.kind === "EnumCustom" ? faceEnum : undefined,
				name,
				id: p.id,
			}),
		),
		el(
			"ViewModelInstance",
			{ exports: true, name: "Default", id: VMI },
			...Object.values(props).map((p) =>
				el(`ViewModelInstance${p.kind === "EnumCustom" ? "Enum" : p.kind}`, {
					propertyValue: p.init,
					viewModelPropertyId: p.id,
				}),
			),
		),
	),
	...converters,
);

await Bun.write(
	`${dir}/scene.rml`,
	`<!-- Generated by scripts/rive.ts from src/mascot.ts. Edit those, not this. -->\n${scene}\n`,
);
await $`rive ${dir} --verify`;
await $`rive ${dir} --once`.quiet();
await Bun.write(
	`${import.meta.dir}/../mascot.riv`,
	Bun.file(`${dir}/build/mascot.riv`),
);
console.log("Mascot built: mascot.riv");
