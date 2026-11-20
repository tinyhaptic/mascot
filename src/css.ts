/**
 * The mascot's styles. `mount` adds them to the page once; `mascot.css` is the
 * same text, written by the build.
 */
export const css = `
.mascot {
	position: relative;
	display: inline-block;
	vertical-align: middle;
}
.mascot[data-alive] {
	cursor: pointer;
}
.mascot > svg {
	display: block;
	width: 100%;
	height: 100%;
	overflow: visible;
}
.mascot > svg:not(.dead) [data-part="spirals"] {
	display: none;
}
/* The live mascot. Five times its size, for what flies off it. */
.mascot > canvas {
	position: absolute;
	z-index: 10;
	inset: -200%;
	width: 500%;
	height: 500%;
	pointer-events: none;
	visibility: hidden;
}
/* Once the live mascot has drawn, it takes over from the drawing. */
.mascot[data-live] > svg {
	visibility: hidden;
}
.mascot[data-live] > canvas {
	visibility: visible;
}
`.trimStart();
