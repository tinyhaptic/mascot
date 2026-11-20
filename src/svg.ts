import {
	COLOR,
	EYES,
	type Face,
	poses,
	SPIRAL,
	shapes,
	spiral,
} from "./mascot.js";

export type MascotSvgOptions = {
	/** The face it is drawn with. Default "hi". */
	face?: Face;
	/** Unique on the page: the eye outline is defined once under this id and referenced. */
	id: string;
};

/**
 * The inside of a mascot's `<svg viewBox="0 0 32 32">`: the eyes, each with
 * its shadow, the pupils, the mouth, and the spirals a knocked-out mascot
 * shows (hidden unless the svg has the class `dead`). The eyes, pupils and
 * shadows keep their colours on light and dark themes; the outline and mouth
 * take currentColor.
 */
export function mascotSvg({ face = "hi", id }: MascotSvgOptions): string {
	const s = shapes(poses[face]);
	const swirl = `fill="none" stroke="${COLOR.pupil}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${SPIRAL.weight}"`;
	const round = `stroke-linejoin="round" stroke-width="1.3"`;
	return (
		`<defs><path id="${id}" d="${s.eye}"/>` +
		`<clipPath id="${id}-clip"><use href="#${id}"/></clipPath></defs>` +
		`<g>` +
		`<use href="#${id}" transform="translate(${EYES.depth.x} ${EYES.depth.y})" fill="${COLOR.shadow}" stroke="${COLOR.shadow}" ${round}/>` +
		`<use href="#${id}" fill="${COLOR.eye}"/>` +
		`<path d="${s.pupil}" fill="${COLOR.pupil}" clip-path="url(#${id}-clip)"/>` +
		`<use href="#${id}" fill="none" stroke="currentColor" ${round}/>` +
		`</g><g data-part="spirals">` +
		EYES.at
			.map(
				(cx) =>
					`<g transform="translate(${cx} ${EYES.cy})"><path d="${spiral()}" ${swirl}/></g>`,
			)
			.join("") +
		`</g><path d="${s.mouth}" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/>`
	);
}
