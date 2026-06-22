/**
 * Admin mode state management via `sessionStorage`.
 *
 * Admin mode is toggled on the Settings page and controls visibility of
 * destructive actions (backup/restore, password change, city asset editing).
 * The `adminModeUpdatedEvent` custom event notifies all consumers when
 * the admin state changes.
 *
 * @module data/adminMode
 */

/** Custom event name dispatched when admin mode is toggled. */
export const adminModeUpdatedEvent = "mapofus:admin-mode-updated";
/** SessionStorage key for the admin unlock flag. */
export const adminModeSessionKey = "mapofus:admin-unlocked";

/**
 * Read the current admin mode state from `sessionStorage`.
 * @returns `true` if admin mode is unlocked in the current browser session.
 */
export const readAdminMode = () => {
  if (typeof window === "undefined") return false;

  return window.sessionStorage.getItem(adminModeSessionKey) === "true";
};

/**
 * Write the admin mode state to `sessionStorage` and notify consumers.
 * @param unlocked - `true` to enable admin mode, `false` to disable.
 */
export const writeAdminMode = (unlocked: boolean) => {
  if (unlocked) window.sessionStorage.setItem(adminModeSessionKey, "true");
  else window.sessionStorage.removeItem(adminModeSessionKey);

  window.dispatchEvent(new CustomEvent<boolean>(adminModeUpdatedEvent, { detail: unlocked }));
};
