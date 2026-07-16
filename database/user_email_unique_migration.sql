-- Make user email unique
-- Run this if your existing users table was created before the email uniqueness rule.
-- Empty or NULL emails are allowed; only duplicate non-empty emails will block the statement.

ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
