/**
 * Escrow state machine.
 *
 * Lifecycle:
 *   HELD ──confirm-receipt──▶ RELEASED        (buyer releases funds to seller)
 *   HELD ──dispute─────────▶ DISPUTED        (either party opens a dispute)
 *   DISPUTED ──resolve─────▶ RELEASED         (admin decides for the seller)
 *   DISPUTED ──resolve─────▶ REFUNDED         (admin decides for the buyer)
 *
 * RELEASED and REFUNDED are terminal.
 *
 * This is the single source of truth for which transitions are legal. The API
 * routes still enforce auth and use conditional writes for race-safety; they
 * call canTransitionEscrow() for the legality check.
 */

import type { EscrowStatus } from "@prisma/client";

export const ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  HELD: ["RELEASED", "DISPUTED"],
  DISPUTED: ["RELEASED", "REFUNDED"],
  RELEASED: [],
  REFUNDED: [],
};

/** Whether an escrow may move from `from` to `to`. */
export function canTransitionEscrow(from: EscrowStatus, to: EscrowStatus): boolean {
  return ESCROW_TRANSITIONS[from]?.includes(to) ?? false;
}
