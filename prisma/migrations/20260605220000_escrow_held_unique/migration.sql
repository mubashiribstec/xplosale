-- Prevent two concurrent escrow transactions from both being HELD for the same
-- listing (double-escrow / double-charge race). A partial unique index is the
-- atomic DB-level backstop the application-level findFirst check cannot provide.
CREATE UNIQUE INDEX IF NOT EXISTS "EscrowTransaction_listingId_held_key"
  ON "EscrowTransaction" ("listingId")
  WHERE status = 'HELD';
