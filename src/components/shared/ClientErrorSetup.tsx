"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { initClientLogger } from "@/lib/logger.client";

/**
 * Mounts the client-side error capture system exactly once.
 * Placed in the root layout so it covers every page.
 * Reads the session role to tag captured events (role only, never identity).
 */
export default function ClientErrorSetup() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;

  useEffect(() => {
    initClientLogger(role);
  // Only init once; role is stored on window after first call
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
