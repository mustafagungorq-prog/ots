-- Migration: Enforce one parent per student in parent_student_links.
-- A student can have only one parent, but a parent can have many students.

USE ots;

-- Remove duplicate student_id rows, keeping the earliest link (smallest id).
DELETE l1 FROM parent_student_links l1
INNER JOIN parent_student_links l2
  ON l1.student_id = l2.student_id AND l1.id > l2.id;

-- Add unique constraint on student_id if it does not already exist.
ALTER TABLE parent_student_links
  ADD UNIQUE KEY uniq_student (student_id);
