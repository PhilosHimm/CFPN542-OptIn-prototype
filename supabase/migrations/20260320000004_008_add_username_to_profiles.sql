-- Migration 008: Add username column to profiles
-- The onboarding flow sets a username; Layout gates entry until it's set.
-- This column was missing from the initial schema, causing an infinite redirect loop.

alter table profiles
  add column if not exists username text;

-- Enforce uniqueness so two users can't claim the same handle.
create unique index if not exists profiles_username_unique
  on profiles (username)
  where username is not null;
