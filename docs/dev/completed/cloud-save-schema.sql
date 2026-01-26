-- Cloud Save System Database Schema
-- Run this in your Supabase SQL Editor to set up the game_saves table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create game_saves table
CREATE TABLE IF NOT EXISTS game_saves (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  save_type TEXT NOT NULL DEFAULT 'manual', -- 'autosave' | 'manual'
  label TEXT,
  save_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_updated_at ON game_saves(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE game_saves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Users can view own saves" ON game_saves;
DROP POLICY IF EXISTS "Users can insert own saves" ON game_saves;
DROP POLICY IF EXISTS "Users can update own saves" ON game_saves;
DROP POLICY IF EXISTS "Users can delete own saves" ON game_saves;

-- Create RLS policies
-- Users can only view their own saves
CREATE POLICY "Users can view own saves"
  ON game_saves FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert saves for themselves
CREATE POLICY "Users can insert own saves"
  ON game_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own saves
CREATE POLICY "Users can update own saves"
  ON game_saves FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own saves
CREATE POLICY "Users can delete own saves"
  ON game_saves FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_game_saves_updated_at ON game_saves;
CREATE TRIGGER update_game_saves_updated_at
  BEFORE UPDATE ON game_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON game_saves TO authenticated;
GRANT SELECT ON game_saves TO anon;
