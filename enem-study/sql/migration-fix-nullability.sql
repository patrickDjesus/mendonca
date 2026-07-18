-- Migration: Fix nullable node_id + materials column name
-- Run this in Supabase SQL Editor after setup-safe.sql

-- Make node_id nullable on videos, materials, challenges
-- (content can be created standalone, not tied to a journey node)
ALTER TABLE public.videos
  ALTER COLUMN node_id DROP NOT NULL;

ALTER TABLE public.materials
  ALTER COLUMN node_id DROP NOT NULL;

ALTER TABLE public.challenges
  ALTER COLUMN node_id DROP NOT NULL;

-- Fix materials table: column is file_url, not url
-- If any inserts used 'url' and failed silently, this ensures the correct column exists
-- (column already exists as file_url, no rename needed — just the JS service needs fixing)
