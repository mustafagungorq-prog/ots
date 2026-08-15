-- Adds pending-approval support for parent sign-ups.
-- Run this on existing databases before deploying the new auth flow.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE;

-- Existing users are pre-approved.
UPDATE users SET approved = TRUE WHERE approved IS NULL;
