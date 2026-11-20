import { useEffect, useId, useRef } from "react";

import { css } from "./css.js";
import type { Face } from "./mascot.js";
import { mount } from "./mount.js";
import { mascotSvg } from "./svg.js";

export type MascotProps = {
	className?: string;
	/** Alive (the default) it watches, blinks and can be poked; otherwise a still drawing. */
	alive?: boolean;
	/** The face a still mascot is drawn with. Default "hi". */
	face?: Face;
	/** A standing mood that replaces its resting calm: "lost" for a 404 page. */
	mood?: "lost";
	/** Colours for the lines of a poke and the z's it sleeps with. Any CSS colour. */
	pokeColor?: string;
	zColor?: string;
};

/**
 * The Tiny Haptic mascot for React 19. Renders on the server; comes alive in
 * the browser. Size it and colour its outline with `className`
 * ("size-6 text-foreground").
 */
export function Mascot({
	className,
	alive = true,
	face,
	mood,
	pokeColor,
	zColor,
}: MascotProps) {
	const ref = useRef<SVGSVGElement>(null);
	const id = `mascot-${useId().replace(/[^a-z0-9]/gi, "")}`;
	const shown = face ?? mood ?? "hi";

	useEffect(() => {
		if (!alive || !ref.current) return;
		return mount(ref.current, {
			alive,
			mood,
			colors: { poke: pokeColor, z: zColor },
		});
	}, [alive, mood, pokeColor, zColor]);

	return (
		<>
			{/* React 19 hoists this into <head>, once for every mascot. */}
			<style href="tinyhaptic-mascot" precedence="default">
				{css}
			</style>
			<svg
				ref={ref}
				viewBox="0 0 32 32"
				aria-hidden="true"
				data-alive={alive || undefined}
				data-mood={mood}
				className={["mascot", shown === "dead" && "dead", className]
					.filter(Boolean)
					.join(" ")}
				// eslint-disable-next-line react/no-danger -- the package's own drawing, no outside input
				dangerouslySetInnerHTML={{ __html: mascotSvg({ face: shown, id }) }}
			/>
		</>
	);
}
