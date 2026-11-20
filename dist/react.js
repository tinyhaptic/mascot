import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef } from "react";
import { css } from "./css.js";
import { mount } from "./mount.js";
import { mascotSvg } from "./svg.js";
/**
 * The Tiny Haptic mascot for React 19. Renders on the server as a drawing;
 * in the browser the live mascot takes over. Size it and colour its outline
 * with `className` ("size-6 text-foreground").
 */
export function Mascot({ className, alive = true, face, mood, pokeColor, zColor, assets, }) {
    const ref = useRef(null);
    const id = `mascot-${useId().replace(/[^a-z0-9]/gi, "")}`;
    const shown = face ?? mood ?? "hi";
    const inner = `<svg viewBox="0 0 32 32" aria-hidden="true"${shown === "dead" ? ` class="dead"` : ""}>${mascotSvg({ face: shown, id })}</svg>` +
        (alive ? `<canvas aria-hidden="true"></canvas>` : "");
    useEffect(() => {
        if (!alive || !ref.current)
            return;
        return mount(ref.current, {
            mood,
            assets,
            colors: { poke: pokeColor, z: zColor },
        });
    }, [alive, mood, pokeColor, zColor, assets]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { href: "tinyhaptic-mascot", precedence: "default", children: css }), _jsx("span", { ref: ref, "data-alive": alive || undefined, "data-mood": mood, className: ["mascot", className].filter(Boolean).join(" "), 
                // eslint-disable-next-line react/no-danger -- the package's own drawing, no outside input
                dangerouslySetInnerHTML: { __html: inner } })] }));
}
