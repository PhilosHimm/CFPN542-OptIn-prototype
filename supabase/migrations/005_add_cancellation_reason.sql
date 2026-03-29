-- Migration 005: Add cancellation_reason column to games table
-- Required by cancelGame() in gameData.ts which sets this field when cancelling.

alter table games add column if not exists cancellation_reason text;
