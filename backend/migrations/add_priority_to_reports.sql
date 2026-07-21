-- Migration: Add priority column to reports table
-- Run this script once against your database before deploying backend changes.
-- Safe to run: additive only, existing rows default to 'medium'.

ALTER TABLE reports
  ADD COLUMN priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium'
  AFTER status;
