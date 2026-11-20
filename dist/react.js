import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef } from "react";
import { css } from "./css.js";
import { mount } from "./mount.js";
import { mascotSvg } from "./svg.js";
/**
 * The Tiny Haptic mascot for React 19. Renders on the server; comes alive in
 * the browser. Size it and colour its outline with `className`
 * ("size-6 text-foreground").
 */
export function Mascot({ className, alive = true, face, mood, pokeColor, zColor, }) {
    const ref = useRef(null);
    const id = `mascot-${useId().replace(/[^a-z0-9]/gi, "")}`;
    const shown = face ?? mood ?? "hi";
    useEffect(() => {
        if (!alive || !ref.current)
            return;
        return mount(ref.current, {
            alive,
            mood,
            colors: { poke: pokeColor, z: zColor },
        });
    }, [alive, mood, pokeColor, zColor]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { href: "tinyhaptic-mascot", precedence: "default", children: css }), _jsx("svg", { ref: ref, viewBox: "0 0 32 32", "aria-hidden": "true", "data-alive": alive || undefined, "data-mood": mood, className: ["mascot", shown === "dead" && "dead", className]
                    .filter(Boolean)
                    .join(" "), 
                // biome-ignore lint/security/noDangerouslySetInnerHtml: the package's own drawing, no outside input
                dangerouslySetInnerHTML: { __html: mascotSvg({ face: shown, id }) } })] }));
}
