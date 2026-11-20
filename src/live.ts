/**
 * Brings a mascot to life. The drawing (`mascotHtml`) is replaced, once it can
 * be, by the live mascot: a Rive file (mascot.riv, built from the same poses by
 * scripts/rive.ts). The file does the moving: it eases between faces, blinks,
 * breathes, opens its pupils in the dark, goes dizzy or falls asleep, jolts
 * when poked, and throws off the sparks and lines. This decides what it should
 * be doing and tells it, through the file's view model:
 * - Its eyes dart to what it is looking at and settle, rather than gliding,
 *   and its head follows them a little. Like real eyes: a quick jump (a
 *   saccade) to something new, smooth pursuit of something moving nearby.
 * - It watches the cursor while the cursor moves, then loses interest: it looks
 *   back at you, glances around, and now and then narrows its eyes.
 * - It blinks at a human pace, sometimes twice, often when its eyes jump far.
 * - Hovered, it looks up at you with interest. A click is a poke: it squashes and
 *   springs back, startled, with a few lines flicking out from the spot. Keep
 *   poking and its temper rises: first a glare, then fury, shaking and
 *   throwing off red sparks, until it is left alone long enough to cool down.
 *   Push it past that and it is knocked out for a few seconds, spirals turning
 *   in its eyes. It looks after the cursor sadly when it leaves the page.
 * - It notices the page: it looks at the link or button you point at (or tab
 *   to) with interest, follows the page with its eyes as it scrolls, and
 *   reacts when the theme (`data-theme` on <html>) changes. Lights on: it
 *   flinches shut, peeks out squinting, then relaxes. Lights off: its eyes go
 *   wide and it looks left and right before settling. Its pupils are larger
 *   in the dark, overshooting for a moment when the theme changes.
 * - Select some text and it follows the end you are dragging, then reads it,
 *   line by line, and looks back up at you. Copy it and it gives a little start.
 * - Now and then, left to itself, it pulls a face: a cheeky wink with its
 *   tongue out, a side-eye, a smug look, an innocent whistle (notes drifting
 *   off), a sneeze (ah… ah… choo, with a spray), or, rarely, cross-eyed or
 *   derpy. Rest the cursor on its nose and it goes cross-eyed looking at it.
 *   It eyes a destructive button sideways (`data-variant="destructive"`); any
 *   link or button can name its own face with `data-mascot-face`. While
 *   something on the page is `aria-busy="true"` it concentrates, tongue out.
 *   Copying gets a smug "got it"; knocked out, it comes round whistling; the
 *   lights coming on sometimes make it sneeze.
 * - Every change of face gives it a little squash and stretch.
 * - Whirl the cursor around it and it gets dizzy, pupils going round.
 * - After a long while with nothing happening it yawns and dozes; left alone
 *   after that, it falls properly asleep, z's drifting up, until something
 *   wakes it with a start (and a hop).
 * With `mood: "lost"` (a 404 page) it doesn't settle: worried eyes darting
 * all around, quick blinks, and only a moment's attention for the cursor.
 * Reduced motion keeps only the gaze and the reactions to hover and click.
 */
import { COLOR, EYES, type Face, gazeOf, poses } from "./mascot.js";
import { VERSION } from "./version.js";

export type EnlivenOptions = {
	/** A standing mood that replaces its resting calm: "lost" for a 404 page. */
	mood?: "lost";
	/**
	 * What it throws onto the page: the lines of a poke and the z's it sleeps
	 * with. Any CSS colour, `var(--x)` included. Default: its outline colour,
	 * faded.
	 */
	colors?: { poke?: string; z?: string };
	/**
	 * Where mascot.riv and rive.wasm are served from (`mascot assets <dir>`
	 * writes them). Default `/mascot/<version>/`.
	 */
	assets?: string;
};

type Spot = { x: number; y: number }; // in client coordinates
type Line = { left: number; right: number; y: number };
// Selected text: its lines on screen, the end being moved, and whether it has held still.
type Selected = { lines: Line[]; focus: Spot; settled: boolean };
type Rive = typeof import("@rive-app/webgl2");
type Model = import("@rive-app/webgl2").ViewModelInstance;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const chance = (p: number) => Math.random() < p;
const within = ([min, max]: readonly [number, number]) => rand(min, max);

const DELAY = 90; // ms before the eyes react to the cursor moving
// Eyes follow a target moving nearby smoothly (pursuit), once it has moved `pursue` (face
// units). A target this `jump` far or more is a jump (a saccade), after which they need a
// moment (`rest`, ms) before they can jump again.
const GAZE = {
	pursue: 0.05,
	jump: 1.2,
	rest: [120, 220],
	blinkOver: 2.4,
} as const;
const BLINK = {
	ms: 110,
	slow: 240,
	every: [2200, 5200],
	drowsy: [3500, 7000],
} as const;
const BORED = 2500; // ms without the cursor moving before it stops watching it
// Lost: how soon it looks away from the cursor again, how often it looks somewhere new and for how
// long, how far off (px), and how often it blinks.
const LOST = {
	bored: 600,
	every: [450, 1000],
	look: [280, 700],
	far: 500,
	blink: [1100, 2600],
} as const;
const DOZE = 26000; // ms without anything happening before it dozes
const HEAD = 0.2; // how far the head follows the eyes, as a share of their travel
const GAZING = new Set<Face>([
	"hi",
	"blink",
	"surprised",
	"sad",
	"skeptical",
	"curious",
	"dazzled",
	"annoyed",
	"peering",
	"lost",
	"furious",
]); // faces free to look around
const PRESSABLE = "a, button, [role='button'], summary"; // what on the page can catch its eye
const SCROLL = { ms: 350, far: 300 } as const; // how long it looks the way the page moved, and how far off (px)
// Its temper: each click adds one, and one drains away every `cool` ms. At `annoyed` it glares
// (for `glare` ms after the last click), at `furious` it rages (for `rage` ms), sparks flying.
// At `dead` it has had all it can take and is knocked out for `out` ms, then comes round, calm again.
const TEMPER = {
	annoyed: 4,
	furious: 7,
	dead: 11,
	cool: 900,
	glare: 1800,
	rage: 2600,
	out: 3600,
	whistle: 2400,
} as const;
// Dizzy: the cursor going this many times round it, within this long (ms), no closer than `near`
// and no farther than `far` (in mascot widths). The pupils then go round for `ms`.
const DIZZY = { turns: 2, within: 2600, near: 0.55, far: 6, ms: 2000 } as const;
const SLEEP = { after: 9000, yawn: 1700 } as const; // ms dozing before it is fast asleep, and how long a yawn lasts
// How it takes the theme changing (ms). Lights on: eyes shut for `flinch`, then squinting until `squint`.
// Lights off: wide-eyed for `peer`, looking to each side for `scan`.
const LIGHTS = { flinch: 300, squint: 1300, peer: 1500, scan: 480 } as const;
// Text being selected: its eyes follow the selecting end. Once the selection has held still
// for `settle` ms it reads it, line by line: a fixation every `step` px for `fixate` ms (longer
// at the start of a line), at most `lines` lines and `most` fixations, then skims to the end.
const READ = {
	settle: 450,
	step: 70,
	fixate: [170, 250],
	lineStart: [230, 320],
	lines: 3,
	most: 18,
	copied: 650,
	smug: 1100,
} as const;
// Now and then, when nothing needs its attention, it pulls a face: this often (a share of its idle
// moments), picked by weight, each held this long (ms).
const EMOTE = {
	chance: 0.07,
	faces: [
		["cheeky", 3, 1400],
		["sideeye", 3, 1600],
		["smug", 2, 1500],
		["whistle", 2, 2600],
		["sneeze", 1.5, 0],
		["crosseyed", 0.6, 1100],
		["derp", 0.4, 1500],
	],
} as const satisfies {
	chance: number;
	faces: readonly (readonly [Face, number, number])[];
};
// A sneeze: it builds (a sniff at `sniff` ms), then out it comes at `out`, and is over by `done`.
const SNEEZE = { sniff: 380, out: 820, done: 1350, lights: 0.3 } as const;
// The cursor held still on its nose this long (ms) makes it go cross-eyed, within this far of the
// middle of its face (face units).
const NOSE = { ms: 650, near: 6.5, at: { x: 15.4, y: 18 } } as const;
// Something on the page is busy (`aria-busy="true"`): it concentrates, tongue out, until it is done.
const BUSY = "[aria-busy='true']";
// What it makes of a link or button it looks at: its own `data-mascot-face`, side-eye for a
// destructive one, otherwise interest.
const WARY = "[data-variant='destructive'], .destructive";
// Sparks: how many bursts the file has, and how soon (ms) a poke can throw another.
const SPARKS = { bursts: 4, apart: 180 } as const;
// What it throws onto the page, by default: its outline colour at this opacity.
const FADE = { poke: 0.55, z: 0.45 } as const;

// What the page is doing, watched once and shared by every mascot on it.
const page = {
	cursor: undefined as Spot | undefined, // last known cursor position
	steppers: new Set<(now: number) => boolean>(), // each returns true while it still needs frames
	onMove: new Set<() => void>(), // reactions to the cursor moving
	onLeave: new Set<() => void>(), // …to it leaving the page
	onTarget: new Set<(el?: Element) => void>(), // …to a link or button catching the eye
	onTheme: new Set<(theme?: string) => void>(), // …to the theme switching
	onSelect: new Set<(selected?: Selected) => void>(), // …to text being selected, or let go
	onCopy: new Set<() => void>(), // …to the selection being copied
	noticed: undefined as Element | undefined,
	scrolled: { way: 0, until: 0 }, // which way it last scrolled (1 down, -1 up), and until when that holds its eyes
	frame: 0,
	watching: false,
};
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const bright = () => document.documentElement.dataset.theme !== "dark";

const run = () => {
	page.frame ||= requestAnimationFrame((now) => {
		page.frame = 0;
		if ([...page.steppers].map((step) => step(now)).some(Boolean)) run();
	});
};
const notice = (el?: Element) => {
	if (el === page.noticed) return;
	page.noticed = el;
	for (const react of page.onTarget) react(el);
};

function watchPage() {
	if (page.watching) return;
	page.watching = true;
	addEventListener("pointermove", (e) => {
		if (e.pointerType === "touch") return;
		// It notices a move a beat late.
		const seen = { x: e.clientX, y: e.clientY };
		setTimeout(() => {
			page.cursor = seen;
			for (const react of page.onMove) react();
			run();
		}, DELAY);
	});
	document.documentElement.addEventListener("mouseleave", () => {
		notice(undefined);
		for (const react of page.onLeave) react();
	});
	document.addEventListener("pointerover", (e) => {
		if (e.pointerType !== "touch")
			notice((e.target as Element).closest?.(PRESSABLE) ?? undefined);
	});
	document.addEventListener("focusin", (e) => {
		const el = e.target as Element;
		if (el.matches(":focus-visible"))
			notice(el.closest(PRESSABLE) ?? undefined);
	});
	document.addEventListener("focusout", () => notice(undefined));
	let lastY = scrollY;
	addEventListener(
		"scroll",
		() => {
			const way = Math.sign(scrollY - lastY);
			lastY = scrollY;
			if (way) {
				page.scrolled.way = way;
				page.scrolled.until = performance.now() + SCROLL.ms;
				setTimeout(run, SCROLL.ms + 20); // look back afterwards
			}
			run();
		},
		{ passive: true },
	);
	let settle: number | undefined;
	let pressed = false;
	const selected = (settled: boolean) => {
		clearTimeout(settle);
		const now = readSelection(settled);
		for (const react of page.onSelect) react(now);
		if (now && !settled && !pressed)
			settle = window.setTimeout(() => selected(true), READ.settle);
	};
	document.addEventListener("selectionchange", () => selected(false));
	addEventListener("pointerdown", () => (pressed = true), { capture: true });
	addEventListener(
		"pointerup",
		() => {
			pressed = false;
			if (readSelection(false)) selected(false); // let go: start the wait to read it
		},
		{ capture: true },
	);
	addEventListener("pointercancel", () => (pressed = false), { capture: true });
	document.addEventListener("copy", () => {
		for (const react of page.onCopy) react();
	});
	new MutationObserver(() => {
		for (const react of page.onTheme)
			react(document.documentElement.dataset.theme);
	}).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme"],
	});
}

// The page's selected text, as lines on screen and the end being moved. Nothing for an empty
// selection, one inside a text field, or one that's off screen.
function readSelection(settled: boolean): Selected | undefined {
	const selection = getSelection();
	if (!selection || selection.isCollapsed || !selection.rangeCount) return;
	if (document.activeElement?.matches("input, textarea")) return;
	if (!selection.toString().trim()) return;
	const lines: Line[] = [];
	const boxes = [...selection.getRangeAt(0).getClientRects()]
		.filter((box) => box.width > 1 && box.height > 1)
		.sort((a, b) => a.top - b.top || a.left - b.left);
	for (const box of boxes) {
		const y = box.top + box.height / 2;
		const line = lines.find((l) => Math.abs(l.y - y) < box.height / 2);
		if (line) {
			line.left = Math.min(line.left, box.left);
			line.right = Math.max(line.right, box.right);
		} else lines.push({ left: box.left, right: box.right, y });
	}
	const seen = lines.filter((l) => l.y > 0 && l.y < innerHeight);
	if (!seen.length) return;
	// Where the selecting end is: a caret at the focus, or failing that the last line's end.
	let focus: Spot | undefined;
	if (selection.focusNode) {
		const caret = document.createRange();
		caret.setStart(selection.focusNode, selection.focusOffset);
		const box = caret.getBoundingClientRect();
		if (box.height) focus = { x: box.left, y: box.top + box.height / 2 };
	}
	const last = seen[seen.length - 1];
	return { lines: seen, focus: focus ?? { x: last.right, y: last.y }, settled };
}

// Any CSS colour as [alpha, red, green, blue], by painting it.
let pen: CanvasRenderingContext2D | undefined;
const argb = (css: string): [number, number, number, number] => {
	pen ??= document
		.createElement("canvas")
		.getContext("2d", { willReadFrequently: true })!;
	pen.clearRect(0, 0, 1, 1);
	pen.fillStyle = css;
	pen.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
	return [a, r, g, b];
};

// The runtime, loaded once, after the page has settled.
let runtime: Promise<Rive> | undefined;
const loadRuntime = (wasm: string) =>
	(runtime ??= new Promise<Rive>((resolve, reject) =>
		(window.requestIdleCallback ?? setTimeout)(() =>
			import("@rive-app/webgl2")
				.then((rive) => {
					rive.RuntimeLoader.setWasmUrl(wasm);
					resolve(rive);
				})
				.catch(reject),
		),
	));

/**
 * Brings a mascot drawn by `mascotHtml` (or a component) to life. `root` is
 * its `.mascot` element. Returns a function that stops it.
 */
export function enliven(
	root: HTMLElement,
	{
		mood,
		colors: inks = {},
		assets = `/mascot/${VERSION}/`,
	}: EnlivenOptions = {},
): () => void {
	const canvas = root.querySelector("canvas");
	if (!canvas) return () => {};
	watchPage();
	const base = assets.endsWith("/") ? assets : `${assets}/`;
	const quit = new AbortController();
	const { signal } = quit;
	const timers = new Set<number>();
	const later = (fn: () => void, ms: number) => {
		const timer = window.setTimeout(() => {
			timers.delete(timer);
			fn();
		}, ms);
		timers.add(timer);
		return timer;
	};

	// What it is told, written to the Rive file once that has loaded.
	let model: Model | undefined;
	let rive: import("@rive-app/webgl2").Rive | undefined;
	let resized: ResizeObserver | undefined;
	const said = new Map<string, number | boolean | string>();
	const set = (name: string, value: number | boolean | string) => {
		said.set(name, value);
		if (!model) return;
		if (typeof value === "boolean") model.boolean(name)!.value = value;
		else if (typeof value === "string") model.enum(name)!.value = value;
		else model.number(name)!.value = value;
	};
	const fire = (name: string) => model?.trigger(name)?.trigger();
	const paint = (
		name: string,
		[a, r, g, b]: [number, number, number, number],
	) => model?.color(name)?.argb(a, r, g, b);
	// A colour given as CSS (`var(--x)` too), as it comes out on this mascot.
	const probe = document.createElement("span");
	probe.hidden = true;
	const resolve = (
		css: string,
		fade: number,
	): [number, number, number, number] => {
		probe.style.color = "";
		probe.style.color = css;
		root.append(probe);
		const [a, r, g, b] = argb(getComputedStyle(probe).color);
		probe.remove();
		return [Math.round(a * fade), r, g, b];
	};
	const colors = () => {
		paint("ink", resolve("currentColor", 1));
		paint(
			"ink3",
			inks.z ? resolve(inks.z, 1) : resolve("currentColor", FADE.z),
		);
	};
	const pokeColor = () =>
		inks.poke ? resolve(inks.poke, 1) : resolve("currentColor", FADE.poke);

	loadRuntime(`${base}rive.wasm`)
		.then(({ Rive }) => {
			if (signal.aborted) return;
			rive = new Rive({
				canvas,
				src: `${base}mascot.riv`,
				stateMachine: "Mascot",
				autoplay: false,
				autoBind: true,
				useOffscreenRenderer: true,
				shouldDisableRiveListeners: true,
				onLoad: () => {
					if (signal.aborted || !rive) return;
					rive.resizeDrawingSurfaceToCanvas();
					model = rive.viewModelInstance ?? undefined;
					if (!model) return;
					for (const [name, value] of said) set(name, value);
					colors();
					rive.play();
					requestAnimationFrame(() => {
						if (!signal.aborted) root.setAttribute("data-live", "");
					});
					resized = new ResizeObserver(() =>
						rive?.resizeDrawingSurfaceToCanvas(),
					);
					resized.observe(canvas);
				},
			});
		})
		.catch(() => {}); // no live mascot: the drawing stays

	const lost = mood === "lost";
	let face: Face = lost ? "lost" : "hi";
	const restOf = (name: Face) => {
		const gaze = gazeOf(poses[name]);
		return [gaze.x, gaze.y];
	};
	let fixed = restOf(face); // where its eyes are resting between jumps
	let watching: "you" | "cursor" | Spot = "you";
	let canJumpAt = 0;
	let shutUntil = 0; // a blink in progress
	let moved = performance.now(); // when the cursor last moved
	let dozing = false;
	let asleep = false; // dozed off for good
	const sleep = (deep: boolean) => {
		asleep = deep;
		set("asleep", deep && !still());
	};
	const wake = () => {
		dozing = false;
		sleep(false);
	};
	let dizzyUntil = 0; // while its pupils are going round
	let hovered = false;
	let held: number | undefined; // a timed face that idle moods won't interrupt
	let temper = 0; // how riled it is by being clicked
	let outUntil = 0; // while it is knocked out
	let pokedAt = 0; // when it was last clicked
	let target: Element | undefined; // a link or button that has its attention
	let scanningUntil = 0; // while it is looking around after the lights go out
	let busy = false; // something on the page is working (aria-busy)
	let crossed = false; // the cursor is resting on its nose
	const host = root.closest("[data-mascot-host]") ?? root; // what counts as hovering it
	set("face", face);
	set("dark", !bright());

	// Where the pupils sit when looking at a spot.
	const aim = (spot: Spot) => {
		const box = root.getBoundingClientRect();
		const unit = box.width / 32;
		if (!unit) return;
		const dx = spot.x - (box.left + ((EYES.at[0] + EYES.at[1]) / 2) * unit);
		const dy = spot.y - (box.top + EYES.cy * unit);
		const dist = Math.hypot(dx, dy) || 1;
		const near = Math.min(1, dist / (box.width * 1.5));
		return [
			(dx / dist) * EYES.reach.x * near,
			(dy / dist) * EYES.reach.y * near,
		];
	};

	// Where a link or button begins: its icon or first word, not its middle.
	const startOf = (el: Element): Spot => {
		const box = el.getBoundingClientRect();
		return {
			x: box.left + Math.min(box.width / 2, 24),
			y: box.top + box.height / 2,
		};
	};
	// Straight down (or up) the page from where it sits.
	const beyond = (way: number): Spot => {
		const box = root.getBoundingClientRect();
		return {
			x: box.left + box.width / 2,
			y: box.top + box.height / 2 + way * SCROLL.far,
		};
	};

	const blink = (ms: number = BLINK.ms) => {
		const until = (shutUntil = Math.max(shutUntil, performance.now() + ms));
		set("shut", true);
		later(() => {
			if (shutUntil === until) set("shut", false);
		}, until - performance.now());
	};

	// One frame: where the eyes should be. They jump; the file eases the jump.
	const step = (time: number) => {
		const rest = restOf(face);
		const spot = target
			? startOf(target)
			: time < page.scrolled.until
				? beyond(page.scrolled.way)
				: watching === "you"
					? undefined
					: watching === "cursor"
						? page.cursor
						: watching;
		// A glance somewhere outranks whatever link it was looking at.
		const glancing = typeof watching === "object" ? watching : undefined;
		const looking = glancing ?? spot;
		const want = (GAZING.has(face) && looking && aim(looking)) || rest;
		const far = Math.hypot(want[0] - fixed[0], want[1] - fixed[1]);
		const waiting = far >= GAZE.jump && time < canJumpAt;
		// Held while its pupils go round, or for a moment after a jump.
		if (time >= dizzyUntil && !waiting) {
			if (far >= GAZE.jump) {
				fixed = want;
				canJumpAt = time + within(GAZE.rest);
				// People often blink as their eyes travel far.
				if (far > GAZE.blinkOver && !still() && chance(0.3)) blink();
			} else if (far > GAZE.pursue) fixed = want;
		}
		set("lookX", fixed[0]);
		set("lookY", fixed[1]);
		// The head turns a little the way the eyes go.
		set("headX", (fixed[0] - rest[0]) * HEAD);
		set("headY", (fixed[1] - rest[1]) * HEAD);
		return waiting;
	};
	page.steppers.add(step);

	const show = (name: Face) => {
		if (name !== face && !still()) fire("pop"); // a little squash and stretch
		face = name;
		set("face", name);
		set("whistle", name === "whistle" && !still()); // the notes drift off while it whistles
		run();
	};
	// The face a link or button gets: its own, side-eye for a destructive one, or interest.
	const faceFor = (el: Element): Face => {
		const own =
			el.closest<HTMLElement>("[data-mascot-face]")?.dataset.mascotFace;
		if (own && own in poses) return own as Face;
		return el.matches(WARY) ? "sideeye" : "curious";
	};
	const rest = () =>
		show(
			hovered && crossed
				? "crosseyed"
				: target
					? faceFor(target)
					: hovered
						? "curious"
						: asleep
							? "asleep"
							: dozing
								? "sleepy"
								: lost
									? "lost"
									: busy
										? "focused"
										: "hi",
		);

	const hold = (name: Face, ms: number) => {
		show(name);
		if (held) clearTimeout(held);
		held = later(() => {
			held = undefined;
			rest();
		}, ms);
	};

	const wiggle = () => {
		if (!still()) fire("wiggle");
	};

	// A poke lands: a few short lines flick outward from where it was touched. A hard one lands red.
	const impact = (x: number, y: number, hard: boolean) => {
		if (still()) return;
		const box = root.getBoundingClientRect();
		set("pokeX", ((x - box.left) / box.width) * 32);
		set("pokeY", ((y - box.top) / box.height) * 32);
		set("impactTurn", rand(0, Math.PI * 2));
		paint("impactColor", hard ? argb(COLOR.rage) : pokeColor());
		fire("impact");
	};

	// Fury: it shakes, and sparks fly off it. Each burst flies out whole; the next poke throws
	// the next of the file's bursts, so they overlap rather than cut each other short.
	let burst = 0;
	let burstAt = 0;
	const rage = () => {
		if (still()) return;
		fire("rage");
		const now = performance.now();
		if (now - burstAt < SPARKS.apart) return;
		burstAt = now;
		fire(`spark${(burst++ % SPARKS.bursts) + 1}`);
	};

	// Ah… ah… choo: it screws up its face, sniffs, then out it comes with a jolt and a spray.
	const sneeze = () => {
		if (still()) return;
		hold("sneeze", SNEEZE.done);
		later(() => fire("pop"), SNEEZE.sniff);
		later(() => {
			if (face !== "sneeze") return; // interrupted
			show("achoo");
			fire("wiggle");
			const box = root.getBoundingClientRect();
			impact(
				box.left + (EYES.mouth / 32) * box.width,
				box.top + (27 / 32) * box.height,
				false,
			);
		}, SNEEZE.out);
	};

	// Pulls one of its faces, picked by weight.
	const emote = () => {
		const total = EMOTE.faces.reduce((sum, [, weight]) => sum + weight, 0);
		let roll = rand(0, total);
		const [name, , ms] =
			EMOTE.faces.find(([, weight]) => (roll -= weight) < 0) ?? EMOTE.faces[0];
		watching = "you";
		if (name === "sneeze") sneeze();
		else hold(name, ms);
	};

	// Somewhere on the page, off to a side of it: something to glance at.
	const elsewhere = (): Spot => {
		const box = root.getBoundingClientRect();
		return { x: box.left + rand(-320, 320), y: box.top + rand(-120, 220) };
	};
	const glance = (ms: number, at: Spot = elsewhere()) => {
		const spot = (watching = at);
		run();
		later(() => {
			if (watching === spot) watching = "you";
			run();
		}, ms);
	};

	// What it does with itself when nothing is asking for its attention.
	const idle = () => {
		later(idle, lost ? within(LOST.every) : rand(1300, 3000));
		// Busy: concentrating until it is done (and no dozing off meanwhile).
		const working = !!document.querySelector(BUSY);
		if (working !== busy) {
			busy = working;
			if (busy) wake();
			if (!held) rest();
		}
		if (busy) moved = performance.now();
		if (still() || document.hidden || held || hovered || target || asleep)
			return;
		const quiet = performance.now() - moved;
		if (dozing) {
			// Still nothing: from dozing to fast asleep.
			if (quiet > DOZE + SLEEP.after) {
				sleep(true);
				rest();
			}
			return;
		}
		if (lost) {
			// No settling: after a moment on the cursor, off looking for the way again, any direction.
			if (page.cursor && quiet < LOST.bored) return;
			const box = root.getBoundingClientRect();
			const way = rand(0, Math.PI * 2);
			glance(within(LOST.look), {
				x: box.left + box.width / 2 + Math.cos(way) * LOST.far,
				y: box.top + box.height / 2 + Math.sin(way) * LOST.far,
			});
			return;
		}
		if (quiet > DOZE) {
			// A big yawn, then its eyes start to droop.
			dozing = true;
			watching = "you";
			hold("yawn", SLEEP.yawn);
			return;
		}
		if (page.cursor && quiet < BORED) return; // busy watching the cursor
		if (busy) return; // its eyes stay on the work
		if (chance(EMOTE.chance)) return emote();
		const roll = Math.random();
		if (roll < 0.5) watching = "you";
		else if (roll < 0.84) glance(rand(600, 1400));
		else if (roll < 0.92 && page.cursor) watching = "cursor"; // check on it again
		else {
			glance(1300);
			hold("skeptical", 1300);
		}
		run();
	};

	const blinks = () => {
		later(
			blinks,
			within(dozing ? BLINK.drowsy : lost ? LOST.blink : BLINK.every),
		);
		if (still() || document.hidden || asleep || face === "dead") return;
		blink(dozing ? BLINK.slow : BLINK.ms);
		if (!dozing && chance(0.18)) later(blink, 260); // sometimes twice
	};

	// Dizzy: the cursor whirling around it. Called whenever the cursor moves.
	let [spun, spinFrom, spinAngle] = [0, 0, 0]; // how far round it has gone (radians, signed), since when, and its last bearing
	const spin = () => {
		const cursor = page.cursor;
		if (!cursor || still() || asleep) return;
		const box = root.getBoundingClientRect();
		const [dx, dy] = [
			cursor.x - (box.left + box.width / 2),
			cursor.y - (box.top + box.height / 2),
		];
		const [at, angle, away] = [
			performance.now(),
			Math.atan2(dy, dx),
			Math.hypot(dx, dy) / (box.width || 1),
		];
		let turn = angle - spinAngle;
		turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2; // the short way round
		spinAngle = angle;
		const onward =
			Math.sign(turn) === Math.sign(spun) &&
			Math.abs(turn) < 1.5 &&
			away > DIZZY.near &&
			away < DIZZY.far;
		if (!onward || at - spinFrom > DIZZY.within) [spun, spinFrom] = [0, at]; // changed its mind, wandered off or took too long
		spun += turn;
		if (Math.abs(spun) < DIZZY.turns * Math.PI * 2 || at < dizzyUntil) return;
		spun = 0;
		dizzyUntil = at + DIZZY.ms;
		set("dizzy", true);
		hold("dizzy", DIZZY.ms + 250);
		later(() => {
			set("dizzy", false);
			blink();
		}, DIZZY.ms);
	};

	const onMove = () => {
		moved = performance.now();
		if (dozing) {
			// Woken up, with a start (a bigger one from deep sleep).
			const deep = asleep;
			wake();
			blink();
			hold("surprised", deep ? 800 : 420);
			if (deep && !still()) fire("hop");
		}
		spin();
		nose();
		if (performance.now() > scanningUntil) watching = "cursor"; // a look around isn't cut short by a twitch of the mouse
	};
	// The cursor resting on its nose: it goes cross-eyed looking at it.
	let noseTimer: number | undefined;
	const onNose = () => {
		const cursor = page.cursor;
		if (!cursor || !hovered) return false;
		const box = root.getBoundingClientRect();
		const unit = box.width / 32 || 1;
		return (
			Math.hypot(
				cursor.x - (box.left + NOSE.at.x * unit),
				cursor.y - (box.top + NOSE.at.y * unit),
			) <
			NOSE.near * unit
		);
	};
	const nose = () => {
		clearTimeout(noseTimer);
		if (crossed) {
			crossed = false;
			if (!held) rest();
		}
		if (!onNose()) return;
		noseTimer = later(() => {
			if (!onNose()) return;
			crossed = true;
			if (!held) rest();
		}, NOSE.ms);
	};
	// The cursor left the page: look after it for a moment, a little sad.
	const onLeave = () => {
		if (!page.cursor || dozing || still()) return;
		watching = { ...page.cursor };
		hold("sad", 2200);
	};
	// Something pressable has its attention (unless that something is itself).
	const onTarget = (el?: Element) => {
		if (el && (el.contains(root) || host.contains(el))) el = undefined;
		if (el === target) return;
		target = el;
		moved = performance.now();
		wake();
		if (!held) rest();
		run();
	};
	const onTheme = (theme?: string) => {
		wake();
		set("dark", !bright()); // the file opens or closes the pupils, overshooting
		requestAnimationFrame(colors); // once the new theme's colours apply
		if (theme !== "dark") {
			// Lights on: now and then the glare makes it sneeze.
			if (!still() && chance(SNEEZE.lights)) return sneeze();
			// Otherwise: flinch shut, peek out squinting, relax.
			if (!still()) blink(LIGHTS.flinch);
			hold("dazzled", LIGHTS.squint);
			return;
		}
		// Lights off: eyes wide, a look to each side to find its bearings.
		hold("peering", LIGHTS.peer);
		if (still()) return;
		blink(); // "who turned the lights off?"
		scanningUntil = performance.now() + LIGHTS.peer;
		const box = root.getBoundingClientRect();
		const beside = (way: number): Spot => ({
			x: box.left + box.width / 2 + way * 400,
			y: box.top + box.height / 2,
		});
		later(() => glance(LIGHTS.scan, beside(-1)), 280);
		later(() => glance(LIGHTS.scan, beside(1)), 280 + LIGHTS.scan + 80);
		later(() => {
			watching = "cursor";
			run();
		}, LIGHTS.peer);
	};
	// Text selected: it follows the selecting end, then reads what was picked out.
	let reading = 0; // which selection it is on, so an old read stops when a new one starts
	let selecting = false;
	const onSelect = (selected?: Selected) => {
		const read = ++reading;
		const now = performance.now();
		if (!selected) {
			if (!selecting) return;
			selecting = false;
			scanningUntil = 0;
			watching = page.cursor ? "cursor" : "you";
			if (!held) rest();
			run();
			return;
		}
		selecting = true;
		moved = now;
		wake();
		if (!selected.settled || still()) {
			watching = { ...selected.focus };
			scanningUntil = now + READ.settle;
			if (!held) show("curious");
			run();
			return;
		}
		// Reading: along each line in short fixations, back to the start of the next.
		const plan: [Spot, number][] = [];
		for (const line of selected.lines.slice(0, READ.lines)) {
			const across = Math.max(
				1,
				Math.round((line.right - line.left) / READ.step),
			);
			for (let i = 0; i < across; i++) {
				const x = line.left + ((i + 0.5) / across) * (line.right - line.left);
				plan.push([{ x, y: line.y }, within(i ? READ.fixate : READ.lineStart)]);
			}
		}
		plan.splice(READ.most);
		const last = selected.lines[selected.lines.length - 1];
		if (selected.lines.length > READ.lines || plan.length === READ.most)
			plan.push([{ x: last.right, y: last.y }, within(READ.lineStart)]); // …skims to the end
		const takes = plan.reduce((sum, [, ms]) => sum + ms, 0);
		scanningUntil = now + takes;
		hold("curious", takes + 300);
		let at = 0;
		for (const [spot, ms] of plan) {
			later(() => {
				if (reading !== read) return;
				watching = spot;
				run();
			}, at);
			at += ms;
		}
		later(() => {
			if (reading !== read) return;
			watching = "you"; // done: looks back up at you
			if (selected.lines.length > 1 && !still()) blink(BLINK.slow);
			run();
		}, at);
	};
	// Copied: a little start, then pleased with itself, as if to say "got it".
	const onCopy = () => {
		if (!selecting) return;
		blink();
		hold("surprised", READ.copied + 50);
		later(() => {
			if (face === "surprised") hold("smug", READ.smug);
		}, READ.copied);
	};
	page.onMove.add(onMove);
	page.onSelect.add(onSelect);
	page.onCopy.add(onCopy);
	page.onLeave.add(onLeave);
	page.onTarget.add(onTarget);
	page.onTheme.add(onTheme);

	// Hovered: it gives you its attention, the same interested look it gives a link.
	host.addEventListener(
		"pointerenter",
		() => {
			hovered = true;
			wake();
			if (!held) rest();
		},
		{ signal },
	);
	host.addEventListener(
		"pointerleave",
		() => {
			hovered = false;
			crossed = false;
			if (!held) rest();
		},
		{ signal },
	);

	root.addEventListener(
		"click",
		(e) => {
			e.preventDefault(); // inside a link, a click on the eyes doesn't navigate
			const at = performance.now();
			if (at < outUntil) return; // out cold: nothing gets through
			wiggle();
			// Startled, unless it has had enough.
			temper = Math.max(0, temper - (at - pokedAt) / TEMPER.cool) + 1;
			pokedAt = at;
			const mood =
				temper >= TEMPER.dead
					? "dead"
					: temper >= TEMPER.furious
						? "furious"
						: temper >= TEMPER.annoyed
							? "annoyed"
							: "surprised";
			hold(
				mood,
				mood === "dead"
					? TEMPER.out + 50
					: mood === "furious"
						? TEMPER.rage
						: mood === "annoyed"
							? TEMPER.glare
							: 520,
			);
			if (mood === "dead") {
				// One poke too many: a last burst of sparks, then out cold. It comes round with a blink, its temper spent.
				rage();
				temper = 0;
				outUntil = at + TEMPER.out;
				// …and comes round whistling, as if nothing happened.
				later(() => {
					blink(BLINK.slow);
					hold("whistle", TEMPER.whistle);
				}, TEMPER.out);
			} else if (mood === "furious") rage();
			else if (e.detail) impact(e.clientX, e.clientY, mood === "annoyed");
			else {
				// Pressed from the keyboard: there is no spot, so use its middle.
				const box = root.getBoundingClientRect();
				impact(
					box.left + box.width / 2,
					box.top + box.height / 2,
					mood === "annoyed",
				);
			}
		},
		{ signal },
	);

	run();
	later(idle, rand(1500, 2800));
	later(blinks, rand(1200, 2500));

	return () => {
		quit.abort();
		for (const timer of timers) clearTimeout(timer);
		timers.clear();
		page.steppers.delete(step);
		page.onMove.delete(onMove);
		page.onLeave.delete(onLeave);
		page.onTarget.delete(onTarget);
		page.onTheme.delete(onTheme);
		page.onSelect.delete(onSelect);
		page.onCopy.delete(onCopy);
		resized?.disconnect();
		rive?.cleanup();
		root.removeAttribute("data-live");
	};
}
