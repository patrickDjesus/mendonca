-- Add color column to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS color text;

-- Update the Goal interface to include color (handled in TypeScript)
-- This migration adds the column so color data persists in the database
