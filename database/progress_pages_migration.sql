-- Migration: Add kuran_pages and risale_pages columns to progress table.

USE ots;

ALTER TABLE progress
  ADD COLUMN IF NOT EXISTS kuran_pages INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risale_pages INT DEFAULT 0;
