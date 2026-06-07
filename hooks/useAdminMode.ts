"use client";

import { useEffect, useState } from "react";
import { adminModeUpdatedEvent, readAdminMode } from "@/data/adminMode";

/**
 * Returns `true` when admin mode is unlocked. Listens for the
 * `adminModeUpdatedEvent` custom event so toggling in one component
 * propagates to all consumers.
 */
export function useAdminMode(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsAdmin(readAdminMode()), 0);
    const handleAdminMode = (event: Event) => {
      setIsAdmin(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener(adminModeUpdatedEvent, handleAdminMode);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(adminModeUpdatedEvent, handleAdminMode);
    };
  }, []);

  return isAdmin;
}
