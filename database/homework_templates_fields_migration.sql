-- Add active and type columns to homework_templates for existing databases.
-- Run this if Homework Templates page shows empty or active/type fields are missing.

USE kuran_mektebi;

ALTER TABLE homework_templates
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS type ENUM('ezber','okuma-kuran','okuma-risale','diger') NULL DEFAULT 'diger';
