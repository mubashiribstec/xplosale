-- Admin credentials: username + password hash stored on the User row.
-- Both columns are optional — only admin accounts use them.

ALTER TABLE "User"
  ADD COLUMN "username"     TEXT UNIQUE,
  ADD COLUMN "passwordHash" TEXT;
