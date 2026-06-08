"use client";
import { useEffect } from "react";

export default function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    fetch(`/api/listings/${listingId}/view`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  }, [listingId]);
  return null;
}
