/**
 * The favicon: the eyes on a rounded tile that flips with the browser's
 * theme, dark on a light browser and light on a dark one. Where the media
 * query is ignored it stays a dark tile, which reads on any tab bar.
 */
export declare const favicon: () => string;
/**
 * The icon: the bolder eyes on a square tile, for app icons and profile
 * pictures (phones and social sites round or crop the corners themselves).
 */
export declare const icon: (tone: "dark" | "light") => string;
