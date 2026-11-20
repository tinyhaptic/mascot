import { useEffect, useId, useRef } from "react";

import { css } from "./css.js";
import type { Face } from "./mascot.js";
import { mount } from "./mount.js";
import { mascotSvg } from "./svg.js";

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
export function Mascot({
	className,
	alive = true,
	face,
	mood,
	pokeColor,
	zColor,
	assets,
}: MascotProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const id = `mascot-${useId().replace(/[^a-z0-9]/gi, "")}`;
	const shown = face ?? mood ?? "hi";
	const inner =
		`<svg viewBox="0 0 32 32" aria-hidden="true"${shown === "dead" ? ` class="dead"` : ""}>${mascotSvg({ face: shown, id })}</svg>` +
		(alive ? `<canvas aria-hidden="true"></canvas>` : "");

	useEffect(() => {
		if (!alive || !ref.current) return;
		return mount(ref.current, {
			mood,
			assets,
			colors: { poke: pokeColor, z: zColor },
		});
	}, [alive, mood, pokeColor, zColor, assets]);

	return (
		<>
			{/* React 19 hoists this into <head>, once for every mascot. */}
			<style href="tinyhaptic-mascot" precedence="default">
				{css}
			</style>
			<span
				ref={ref}
				data-alive={alive || undefined}
				data-mood={mood}
				className={["mascot", className].filter(Boolean).join(" ")}
				// eslint-disable-next-line react/no-danger -- the package's own drawing, no outside input
				dangerouslySetInnerHTML={{ __html: inner }}
			/>
		</>
	);
}
