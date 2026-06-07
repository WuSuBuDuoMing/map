/**
 * Returns `true` when `url` is a browser-side image URL that can be rendered
 * directly (a data URL or an https URL), as opposed to a server-side path
 * that should go through `next/image`.
 */
export const isBrowserImageUrl = (url: string) =>
  url.startsWith("data:image/") || url.startsWith("https://");
