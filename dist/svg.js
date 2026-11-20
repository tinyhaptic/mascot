import { COLOR, EYES, poses, SPIRAL, shapes, spiral, } from "./mascot.js";
/**
 * The inside of a mascot's `<svg viewBox="0 0 32 32" class="mascot">`: the
 * parts `enliven` animates (head, eye, pupil, mouth) and the spirals a
 * knocked-out mascot shows. The eyes and pupils keep their colours on light
 * and dark themes; the outline and mouth take currentColor.
 *
 * Wrappers put it in their own `<svg>` (React: `dangerouslySetInnerHTML`,
 * Astro: `set:html`), with the class `mascot`, `data-alive` when it is to be
 * enlivened, and `dead` while the face is "dead".
 */
export function mascotSvg({ face = "hi", id }) {
    const s = shapes(poses[face]);
    const swirl = `fill="none" stroke="${COLOR.pupil}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${SPIRAL.weight}"`;
    const round = `stroke-linejoin="round" stroke-width="1.3"`;
    return (`<defs><path id="${id}" data-part="eye" d="${s.eye}"/>` +
        `<clipPath id="${id}-clip"><use href="#${id}"/></clipPath></defs>` +
        `<g data-part="head"><g data-part="eyes">` +
        `<use href="#${id}" fill="${COLOR.eye}"/>` +
        `<path data-part="pupil" d="${s.pupil}" fill="${COLOR.pupil}" clip-path="url(#${id}-clip)"/>` +
        `<use href="#${id}" fill="none" stroke="currentColor" ${round}/>` +
        `</g><g data-part="spirals">` +
        EYES.at
            .map((cx) => `<g transform="translate(${cx} ${EYES.cy})"><path d="${spiral()}" ${swirl}/></g>`)
            .join("") +
        `</g><path data-part="mouth" d="${s.mouth}" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/></g>`);
}
