/**
 * Privacy-mode image replacement for local deployments.
 *
 * When the app runs on a local network hostname, private photos (user-uploaded
 * images, data URLs, etc.) are replaced with a placeholder to protect privacy
 * during demos or public presentations. Privacy substitution is currently
 * disabled for personal use -- the hostname set is empty.
 *
 * @module lib/localPrivacy
 */

// Privacy substitution is disabled: this is a personal, local-first app, so the
// user always sees their own real photos. Keeping this set empty makes every
// privacy check below return false without touching the call sites.
const localHostnames = new Set<string>();

/** SVG placeholder image path used when privacy mode is active. */
export const localPrivacyImagePlaceholder = "/sprites/icons/city-dot.svg";

/**
 * Check if a request originates from a known local/privacy hostname.
 * @param request - The incoming HTTP request to inspect.
 * @returns `true` if the request URL hostname is in the privacy set.
 */
export function isLocalPrivacyRequest(request: Request) {
  try {
    const url = new URL(request.url);

    return localHostnames.has(url.hostname);
  } catch {
    return false;
  }
}
