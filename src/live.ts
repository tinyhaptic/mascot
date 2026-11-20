/**
 * What makes the mascot behave like someone sitting there: it watches the
 * cursor, blinks, looks at the button you point at, reacts to being poked and
 * to the lights changing, and dozes off when nothing happens.
 *
 * - Its eyes dart to what it is looking at and settle, rather than gliding,
 *   and its head follows them a little.
 * - It watches the cursor while the cursor moves, then loses interest: it looks
 *   back at you, glances around, and now and then narrows its eyes.
 * - It blinks at a human pace, sometimes twice, often when its eyes jump far.
 * - Hovered, it looks up at you with interest. A click is a poke: it squashes and
 *   springs back, startled, with a few lines flicking out from the spot. Keep
 *   poking and its temper rises: first a glare, then fury, shaking and
 *   throwing off red sparks, until it is left alone long enough to cool down.
 *   Push it past that and it is knocked out for a few seconds, spirals turning
 *   in its eyes. It looks after the cursor sadly when it leaves the page, and
 *   after a long while with nothing happening it dozes until something moves.
 * - It notices the page: it looks at the link or button you point at (or tab
 *   to) with interest, follows the page with its eyes as it scrolls, and
 *   reacts when the theme changes. Lights on: it flinches shut, peeks out
 *   squinting, then relaxes. Lights off: its eyes go wide and it looks left
 *   and right before settling.
 * - Its pupils react to light: larger on the dark theme, closing quickly and
 *   opening slowly, and overshooting for a moment when the theme changes.
 * - Whirl the cursor around it and it gets dizzy, pupils going round.
 * - Left alone after dozing off, it falls properly asleep, z's drifting up,
 *   until something wakes it with a start.
 * - It breathes (mascot.css).
 * With `mood: "lost"` (a 404 page) it doesn't settle: worried eyes darting
 * all around, quick blinks, and only a moment's attention for the cursor.
 * Every change is eased, never swapped. Reduced motion keeps only the gaze and
 * the reactions to hover and click, and changes face at once.
 *
 * "The theme" is `data-theme` on <html>: "dark", or anything else for light.
 */
import {
	AT,
	COLOR,
	EYES,
	type Face,
	flatten,
	poses,
	shapes,
	unflatten,
} from "./mascot.js";

export type EnlivenOptions = {
	/** A standing mood that replaces its resting calm. */
	mood?: "lost";
	/** Colours for what it throws onto the page: the lines of a poke and its z's. Any CSS colour. */
	colors?: { poke?: string; z?: string };
};

/** Brings a mascot's <svg> to life. Returns a function that stops it. */
export function enliven(
	svg: SVGSVGElement,
	{ mood, colors = {} }: EnlivenOptions = {},
): () => void {
	const lost = mood === "lost";
	const ink = {
		poke: colors.poke ?? "currentColor",
		z: colors.z ?? "currentColor",
	};
	const still = matchMedia("(prefers-reduced-motion: reduce)");
	// Everything it listens to and every timer it sets stops when it is taken off the page.
	const controller = new AbortController();
	const { signal } = controller;
	let stopped = false;
	const timers = new Set<number>();
	const later = (fn: () => void, ms?: number) => {
		const id = window.setTimeout(() => {
			timers.delete(id);
			if (!stopped) fn();
		}, ms);
		timers.add(id);
		return id;
	};
	const rand = (min: number, max: number) => min + Math.random() * (max - min);
	const chance = (p: number) => Math.random() < p;

	const DELAY = 140; // ms before the eyes react to the cursor moving

	// How quickly each part of the face settles: ms to cover ~63% of the way.
	const TAU = {
		shut: 26, // a lid drops fast…
		open: 70, // …and lifts more slowly
		dart: 38, // the eyes jump to a new spot
		face: 90, // everything else
	};
	// Eyes don't glide: they hold still, then jump once the target has moved
	// this far (viewBox units), and need a moment before they can jump again.
	const JUMP = { min: 0.3, rest: [90, 230], blinkOver: 2.4 } as const;
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
	} as const;
	const IMPACT = { lines: 6, from: 9, to: 20, ms: 300 } as const; // the lines a poke throws out: how many, how far (40ths of the mascot's width), how long
	const SPARK = { color: COLOR.rage, count: [5, 9], ms: [360, 680] } as const;
	// Dizzy: the cursor going this many times round it, within this long (ms), no closer than `near`
	// and no farther than `far` (in mascot widths). The pupils then go round for `ms`, `speed` turns a second.
	const DIZZY = {
		turns: 2,
		within: 2600,
		near: 0.55,
		far: 6,
		ms: 2000,
		speed: 2.4,
	} as const;
	const SLEEP = { after: 9000, z: 1700 } as const; // ms dozing before it is fast asleep, and between z's
	// How it takes the theme changing (ms). Lights on: eyes shut for `flinch`, then squinting until `squint`.
	// Lights off: wide-eyed for `peer`, looking to each side for `scan`. Either way the pupils overshoot
	// by `glare` (a share of their size), which fades over `fade`.
	const LIGHTS = {
		flinch: 300,
		squint: 1300,
		peer: 1500,
		scan: 480,
		glare: { on: -0.3, off: 0.2 },
		fade: 700,
	} as const;
	// The pupils' size on each theme, as a share of their drawn size, and how
	// quickly they get there (ms to cover ~63%): eyes close down fast and open up slowly.
	const IRIS = { light: 1, dark: 1.18, constrict: 110, dilate: 650 } as const;
	const theme = () =>
		document.documentElement.dataset.theme === "dark" ? "dark" : "light";
	const bright = () => theme() === "light";

	type Spot = { x: number; y: number }; // in client coordinates

	// Last known cursor position, shared by every mascot on the page.
	let cursor: Spot | undefined;
	const steppers: ((now: number) => boolean)[] = []; // each returns true while still moving
	const onMove: (() => void)[] = []; // each mascot's reaction to the cursor moving
	const onLeave: (() => void)[] = []; // …and to it leaving the page
	let frame = 0;
	const run = () => {
		if (stopped) return;
		frame ||= requestAnimationFrame((now) => {
			frame = 0;
			if (steppers.map((step) => step(now)).some(Boolean)) run();
		});
	};
	window.addEventListener(
		"pointermove",
		(e) => {
			if (e.pointerType === "touch") return;
			// It notices a move a beat late.
			const seen = { x: e.clientX, y: e.clientY };
			later(() => {
				cursor = seen;
				for (const react of onMove) react();
				run();
			}, DELAY);
		},
		{ signal },
	);
	document.documentElement.addEventListener(
		"mouseleave",
		() => {
			notice(undefined);
			for (const react of onLeave) react();
		},
		{ signal },
	);

	// The link or button under the cursor, or holding keyboard focus.
	const onTarget: ((el?: Element) => void)[] = [];
	let noticed: Element | undefined;
	const notice = (el?: Element) => {
		if (el === noticed) return;
		noticed = el;
		for (const react of onTarget) react(el);
	};
	document.addEventListener(
		"pointerover",
		(e) => {
			if (e.pointerType !== "touch")
				notice((e.target as Element).closest?.(PRESSABLE) ?? undefined);
		},
		{ signal },
	);
	document.addEventListener(
		"focusin",
		(e) => {
			const el = e.target as Element;
			if (el.matches(":focus-visible"))
				notice(el.closest(PRESSABLE) ?? undefined);
		},
		{ signal },
	);
	document.addEventListener("focusout", () => notice(undefined), { signal });

	// Which way the page last scrolled (1 down, -1 up), and until when that holds its eyes.
	const scrolled = { way: 0, until: 0 };
	let lastY = scrollY;
	window.addEventListener(
		"scroll",
		() => {
			const way = Math.sign(scrollY - lastY);
			lastY = scrollY;
			if (way) {
				scrolled.way = way;
				scrolled.until = performance.now() + SCROLL.ms;
				later(run, SCROLL.ms + 20); // look back afterwards
			}
			run();
		},
		{ passive: true, signal },
	);

	// The page switching between light and dark.
	const onTheme: ((theme?: string) => void)[] = [];
	let shown = theme();
	const watcher = new MutationObserver(() => {
		const now = theme();
		if (now === shown) return; // set again, not changed
		shown = now;
		for (const react of onTheme) react(now);
	});
	watcher.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme"],
	});

	const part = <T extends SVGElement = SVGPathElement>(name: string) =>
		svg.querySelector(`[data-part="${name}"]`) as T;
	const parts = {
		head: part<SVGGElement>("head"),
		eye: part("eye"),
		pupil: part("pupil"),
		mouth: part("mouth"),
	};

	let face: Face = lost ? "lost" : "hi";
	let base = flatten(poses[face]); // the expression it is wearing, before gaze and blinks
	const now = [...base]; // the face as drawn
	const eyesOf = (pose: number[]) => pose.slice(AT.pupils, AT.pupils + 4);
	let fixed = eyesOf(base); // where its eyes are resting between jumps
	let watching: "you" | "cursor" | Spot = "you";
	let canJumpAt = 0;
	let shutUntil = 0; // a blink in progress
	let moved = performance.now(); // when the cursor last moved
	let dozing = false;
	let asleep = false; // dozed off for good
	const wake = () => {
		dozing = asleep = false;
	};
	let dizzyUntil = 0; // while its pupils are going round
	let last = 0; // time of the previous frame, 0 when at rest
	let hovered = false;
	let held: number | undefined; // a timed face that idle moods won't interrupt
	let temper = 0; // how riled it is by being clicked
	let outUntil = 0; // while it is knocked out
	let pokedAt = 0; // when it was last clicked
	let target: Element | undefined; // a link or button that has its attention
	let scanningUntil = 0; // while it is looking around after the lights go out
	let glare = 0; // the pupils' overshoot just after the theme changes, fading out
	let iris: number = bright() ? IRIS.light : IRIS.dark; // the pupils' size for the light they are in
	const host = svg.closest(".group") ?? svg;

	// Where each pupil sits when looking at a spot. Each eye aims on its own,
	// so they converge a little on something close.
	const aim = (spot: Spot) => {
		const box = svg.getBoundingClientRect();
		const unit = box.width / 32;
		if (!unit) return;
		return EYES.at.flatMap((cx) => {
			const dx = spot.x - (box.left + cx * unit);
			const dy = spot.y - (box.top + EYES.cy * unit);
			const dist = Math.hypot(dx, dy) || 1;
			const near = Math.min(1, dist / (box.width * 1.5));
			return [
				(dx / dist) * EYES.reach.x * near,
				(dy / dist) * EYES.reach.y * near,
			];
		});
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
		const box = svg.getBoundingClientRect();
		return {
			x: box.left + box.width / 2,
			y: box.top + box.height / 2 + way * SCROLL.far,
		};
	};

	const blink = (ms: number = BLINK.ms) => {
		shutUntil = performance.now() + ms;
		run();
	};

	// One frame: work out the face it is going for, ease toward it, redraw.
	steppers.push((time) => {
		const dt = last ? Math.min(50, time - last) : 16;
		const goal = [...base];

		// Eyes: hold still, then jump to what it is watching.
		const rest = eyesOf(base);
		const spot = target
			? startOf(target)
			: time < scrolled.until
				? beyond(scrolled.way)
				: watching === "you"
					? undefined
					: watching === "cursor"
						? cursor
						: watching;
		// A glance somewhere outranks whatever link it was looking at.
		const glancing = typeof watching === "object" ? watching : undefined;
		const looking = glancing ?? spot;
		const want = (GAZING.has(face) && looking && aim(looking)) || rest;
		const far = Math.hypot(want[0] - fixed[0], want[1] - fixed[1]);
		const waiting = far > JUMP.min && time < canJumpAt;
		if (far > JUMP.min && !waiting) {
			fixed = want;
			canJumpAt = time + rand(...JUMP.rest);
			// People often blink as their eyes travel far.
			if (far > JUMP.blinkOver && !still.matches && chance(0.3))
				shutUntil = time + BLINK.ms;
		}
		goal.splice(AT.pupils, 4, ...fixed);
		const dizzy = time < dizzyUntil;
		if (dizzy) {
			// Round and round, the two eyes a little out of step, winding down toward the end.
			const turn = (time / 1000) * DIZZY.speed * Math.PI * 2;
			const wide = Math.min(1, (dizzyUntil - time) / 500);
			const at = (lag: number) => [
				Math.cos(turn - lag) * EYES.reach.x * 0.8 * wide,
				Math.sin(turn - lag) * EYES.reach.y * 0.6 * wide,
			];
			fixed = [...at(0), ...at(0.9)];
			goal.splice(AT.pupils, 4, ...fixed);
			now.splice(AT.pupils, 4, ...fixed); // no easing: they are already moving smoothly
		}
		const blinking = time < shutUntil;
		if (blinking) goal[AT.open] = 0;

		let moving = waiting || blinking || dizzy;
		for (let i = 0; i < now.length; i++) {
			const isPupil = i >= AT.pupils && i < AT.pupils + 4;
			const tau =
				i === AT.open
					? goal[i] < now[i]
						? TAU.shut
						: TAU.open
					: isPupil
						? TAU.dart
						: TAU.face;
			// Reduced motion: faces change at once; only the pupils still travel.
			const share = still.matches && !isPupil ? 1 : 1 - Math.exp(-dt / tau);
			now[i] += (goal[i] - now[i]) * share;
			if (Math.abs(goal[i] - now[i]) > 0.004) moving = true;
			else now[i] = goal[i];
		}
		// Pupils for the light: small when it is bright, large when it is dark.
		glare *= Math.exp(-dt / LIGHTS.fade);
		if (Math.abs(glare) < 0.01) glare = 0;
		else moving = true;
		const lit = (bright() ? IRIS.light : IRIS.dark) * (1 + glare);
		iris +=
			(lit - iris) *
			(still.matches
				? 1
				: 1 - Math.exp(-dt / (lit < iris ? IRIS.constrict : IRIS.dilate)));
		if (Math.abs(lit - iris) > 0.004) moving = true;
		else iris = lit;
		const pose = unflatten(now);
		pose.pupil = { rx: pose.pupil.rx * iris, ry: pose.pupil.ry * iris };
		const d = shapes(pose);
		parts.eye.setAttribute("d", d.eye);
		parts.pupil.setAttribute("d", d.pupil);
		parts.mouth.setAttribute("d", d.mouth);
		// The head turns a little the way the eyes go.
		const turn = (i: number) =>
			(
				((now[AT.pupils + i] + now[AT.pupils + 2 + i]) / 2 -
					(rest[i] + rest[2 + i]) / 2) *
				HEAD
			).toFixed(2);
		parts.head.setAttribute("transform", `translate(${turn(0)} ${turn(1)})`);
		last = moving ? time : 0;
		return moving;
	});

	const show = (name: Face) => {
		svg.classList.toggle("dead", name === "dead");
		face = name;
		base = flatten(poses[name]);
		run();
	};
	const rest = () =>
		show(
			hovered || target
				? "curious"
				: asleep
					? "asleep"
					: dozing
						? "sleepy"
						: lost
							? "lost"
							: "hi",
		);

	const hold = (name: Face, ms: number) => {
		show(name);
		clearTimeout(held);
		held = later(() => {
			held = undefined;
			rest();
		}, ms);
	};

	const wiggle = () => {
		if (still.matches) return;
		svg.classList.remove("wiggle", "rage");
		void svg.getBoundingClientRect(); // restart the animation
		svg.classList.add("wiggle");
	};

	// Something small that drifts up off the mascot and fades: a z.
	const drift = (text: string, color: string, scale: number, ms: number) => {
		const box = svg.getBoundingClientRect();
		const mark = document.createElement("span");
		mark.ariaHidden = "true";
		mark.textContent = text;
		mark.style.cssText =
			`position:fixed;z-index:100;pointer-events:none;left:${box.left + box.width * rand(0.55, 0.95)}px;top:${box.top + box.height * 0.15}px;` +
			`translate:-50% -50%;font:600 ${Math.max(9, box.width * scale)}px/1 var(--font-sans, system-ui, sans-serif);color:${color}`;
		document.body.append(mark);
		const [dx, dy] = [box.width * rand(0.2, 0.6), -box.height * rand(0.7, 1.1)];
		mark.animate(
			[
				{ transform: "translate(0, 0) scale(0.5)", opacity: 0 },
				{ opacity: 1, offset: 0.25 },
				{
					transform: `translate(${dx}px, ${dy}px) rotate(${rand(-15, 15)}deg) scale(1)`,
					opacity: 0,
				},
			],
			{ duration: ms, easing: "ease-out" },
		).onfinish = () => mark.remove();
	};

	// A poke lands: a few short lines flick outward from where it was touched. A hard one lands red.
	const impact = (x: number, y: number, hard: boolean) => {
		if (still.matches) return;
		const unit = Math.max(1, svg.getBoundingClientRect().width / 40);
		const turn = rand(0, Math.PI * 2);
		for (let i = 0; i < IMPACT.lines; i++) {
			const way = turn + (i / IMPACT.lines) * Math.PI * 2;
			const deg = (way * 180) / Math.PI + 90; // the line points along its way out
			const at = (far: number) =>
				`translate(${Math.cos(way) * far * unit}px, ${Math.sin(way) * far * unit}px) rotate(${deg}deg)`;
			const line = document.createElement("span");
			line.ariaHidden = "true";
			line.style.cssText =
				`position:fixed;z-index:100;pointer-events:none;left:${x}px;top:${y}px;width:${1.6 * unit}px;height:${5 * unit}px;` +
				`translate:-50% -50%;border-radius:9999px;background:${hard ? COLOR.rage : ink.poke}`;
			document.body.append(line);
			line.animate(
				[
					{ transform: `${at(IMPACT.from)} scaleY(0.4)`, opacity: 1 },
					{ opacity: 1, offset: 0.5 },
					{ transform: `${at(IMPACT.to)} scaleY(1)`, opacity: 0 },
				],
				{ duration: IMPACT.ms, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
			).onfinish = () => line.remove();
		}
	};

	// Fury: it shakes, and sparks fly off it.
	const rage = () => {
		if (still.matches) return;
		svg.classList.remove("wiggle", "rage");
		void svg.getBoundingClientRect(); // restart the animation
		svg.classList.add("rage");
		const box = svg.getBoundingClientRect();
		const [cx, cy, r] = [
			box.left + box.width / 2,
			box.top + box.height * 0.4,
			box.width / 2,
		];
		const size = Math.max(6, box.width * 0.2);
		for (let i = Math.round(rand(...SPARK.count)); i > 0; i--) {
			const way = rand(-Math.PI, 0) + rand(-0.5, 0.5); // mostly upward and outward
			const [far, turn] = [r * rand(1.3, 2.4), rand(-140, 140)];
			const spark = document.createElement("span");
			spark.ariaHidden = "true";
			// A four-pointed star, starting on the mascot's edge.
			spark.style.cssText =
				`position:fixed;z-index:100;pointer-events:none;left:${cx + Math.cos(way) * r * 0.8}px;top:${cy + Math.sin(way) * r * 0.8}px;` +
				`width:${size * rand(0.6, 1.2)}px;aspect-ratio:1;translate:-50% -50%;background:${SPARK.color};` +
				"clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)";
			document.body.append(spark);
			spark.animate(
				[
					{ transform: "translate(0, 0) rotate(0deg) scale(0.3)", opacity: 1 },
					{ opacity: 1, offset: 0.6 },
					{
						transform: `translate(${Math.cos(way) * far}px, ${Math.sin(way) * far}px) rotate(${turn}deg) scale(1)`,
						opacity: 0,
					},
				],
				{
					duration: rand(...SPARK.ms),
					easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
				},
			).onfinish = () => spark.remove();
		}
	};

	// Somewhere on the page, off to a side of it: something to glance at.
	const elsewhere = (): Spot => {
		const box = svg.getBoundingClientRect();
		return { x: box.left + rand(-320, 320), y: box.top + rand(-120, 220) };
	};
	const glance = (ms: number, at: Spot = elsewhere()) => {
		const spot = at;
		watching = spot;
		run();
		later(() => {
			if (watching === spot) watching = "you";
			run();
		}, ms);
	};

	// What it does with itself when nothing is asking for its attention.
	const idle = () => {
		later(idle, lost ? rand(...LOST.every) : rand(1300, 3000));
		if (still.matches || document.hidden || held || hovered || target || asleep)
			return;
		const quiet = performance.now() - moved;
		if (dozing) {
			// Still nothing: from dozing to fast asleep.
			if (quiet > DOZE + SLEEP.after) {
				asleep = true;
				rest();
			}
			return;
		}
		if (lost) {
			// No settling: after a moment on the cursor, off looking for the way again, any direction.
			if (cursor && quiet < LOST.bored) return;
			const box = svg.getBoundingClientRect();
			const way = rand(0, Math.PI * 2);
			return glance(rand(...LOST.look), {
				x: box.left + box.width / 2 + Math.cos(way) * LOST.far,
				y: box.top + box.height / 2 + Math.sin(way) * LOST.far,
			});
		}
		if (quiet > DOZE) {
			dozing = true;
			watching = "you";
			return rest();
		}
		if (cursor && quiet < BORED) return; // busy watching the cursor
		const roll = Math.random();
		if (roll < 0.5) watching = "you";
		else if (roll < 0.84) glance(rand(600, 1400));
		else if (roll < 0.92 && cursor)
			watching = "cursor"; // check on it again
		else {
			glance(1300);
			hold("skeptical", 1300);
		}
		run();
	};

	const blinks = () => {
		const [min, max] = dozing ? BLINK.drowsy : lost ? LOST.blink : BLINK.every;
		later(blinks, rand(min, max));
		if (still.matches || document.hidden || asleep || face === "dead") return;
		blink(dozing ? BLINK.slow : BLINK.ms);
		if (!dozing && chance(0.18)) later(blink, 260); // sometimes twice
	};

	onMove.push(() => {
		moved = performance.now();
		if (dozing) {
			// Woken up, with a start (a bigger one from deep sleep).
			const deep = asleep;
			wake();
			blink();
			hold("surprised", deep ? 800 : 420);
			if (deep) wiggle();
		}
		spin();
		if (performance.now() > scanningUntil) watching = "cursor"; // a look around isn't cut short by a twitch of the mouse
	});
	// The cursor left the page: look after it for a moment, a little sad.
	onLeave.push(() => {
		if (!cursor || dozing || still.matches) return;
		watching = { ...cursor };
		hold("sad", 2200);
	});

	// Something pressable has its attention (unless that something is itself).
	onTarget.push((el) => {
		if (el && (el.contains(svg) || host.contains(el))) el = undefined;
		if (el === target) return;
		target = el;
		moved = performance.now();
		wake();
		if (!held) rest();
		run();
	});
	onTheme.push((theme) => {
		wake();
		if (theme === "light") {
			// Lights on: flinch shut, peek out squinting with pinprick pupils, relax.
			glare = LIGHTS.glare.on;
			if (!still.matches) blink(LIGHTS.flinch);
			return hold("dazzled", LIGHTS.squint);
		}
		// Lights off: eyes wide, pupils opening, a look to each side to find its bearings.
		glare = LIGHTS.glare.off;
		hold("peering", LIGHTS.peer);
		if (still.matches) return;
		blink(); // "who turned the lights off?"
		scanningUntil = performance.now() + LIGHTS.peer;
		const box = svg.getBoundingClientRect();
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
	});

	// Dizzy: the cursor whirling around it. Called whenever the cursor moves.
	let [spun, spinFrom, spinAngle] = [0, 0, 0]; // how far round it has gone (radians, signed), since when, and its last bearing
	const spin = () => {
		if (!cursor || still.matches || asleep) return;
		const box = svg.getBoundingClientRect();
		const [dx, dy] = [
			cursor.x - (box.left + box.width / 2),
			cursor.y - (box.top + box.height / 2),
		];
		const [at, angle, away] = [
			performance.now(),
			Math.atan2(dy, dx),
			Math.hypot(dx, dy) / (box.width || 1),
		];
		let step = angle - spinAngle;
		step -= Math.round(step / (Math.PI * 2)) * Math.PI * 2; // the short way round
		spinAngle = angle;
		const onward =
			Math.sign(step) === Math.sign(spun) &&
			Math.abs(step) < 1.5 &&
			away > DIZZY.near &&
			away < DIZZY.far;
		if (!onward || at - spinFrom > DIZZY.within) [spun, spinFrom] = [0, at]; // changed its mind, wandered off or took too long
		spun += step;
		if (Math.abs(spun) < DIZZY.turns * Math.PI * 2 || at < dizzyUntil) return;
		spun = 0;
		dizzyUntil = at + DIZZY.ms;
		hold("dizzy", DIZZY.ms + 250);
		later(blink, DIZZY.ms);
	};

	// Asleep: z's drift up.
	let big = false;
	const snore = setInterval(() => {
		if (!asleep || document.hidden || still.matches) return;
		big = !big;
		drift("z", ink.z, big ? 0.34 : 0.24, 1900);
	}, SLEEP.z);

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
			if (!held) rest();
		},
		{ signal },
	);

	svg.addEventListener(
		"click",
		(e) => {
			e.preventDefault(); // inside the header's home link, a click on the eyes doesn't navigate
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
					? TEMPER.out
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
				later(() => blink(BLINK.slow), TEMPER.out);
			} else if (mood === "furious") rage();
			else if (e.detail) impact(e.clientX, e.clientY, mood === "annoyed");
			else {
				// Pressed from the keyboard: there is no spot, so use its middle.
				const box = svg.getBoundingClientRect();
				impact(
					box.left + box.width / 2,
					box.top + box.height / 2,
					mood === "annoyed",
				);
			}
		},
		{ signal },
	);

	later(idle, rand(1500, 2800));
	later(blinks, rand(1200, 2500));

	return () => {
		stopped = true;
		controller.abort();
		watcher.disconnect();
		for (const id of timers) clearTimeout(id);
		clearInterval(snore);
		cancelAnimationFrame(frame);
	};
}
