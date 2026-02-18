-- Migration to add note column to wines table
ALTER TABLE wines ADD COLUMN IF NOT EXISTS note text;
