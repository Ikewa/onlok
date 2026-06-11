-- Run this once on the live database to add the tiktok_handle column
-- Safe to run even if the column already exists (IF NOT EXISTS guard)

USE onlok_db;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tiktok_handle VARCHAR(255) NULL AFTER facebook_handle;
