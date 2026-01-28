/*
  # Migration Tracking System

  1. Purpose
    - Track which database migrations have been applied
    - Prevent duplicate migration execution
    - Provide audit trail of database schema changes
    - Enable automatic migration system for builds

  2. New Tables
    - `schema_migrations`
      - `id` (uuid, primary key) - Unique identifier for each migration record
      - `filename` (text, unique) - Name of the migration file (e.g., "20260117205509_17d99760.sql")
      - `applied_at` (timestamptz) - Timestamp when migration was applied
      - `checksum` (text, nullable) - SHA-256 hash of migration file contents for integrity verification
      - `status` (text) - Status of migration: 'applied', 'failed', 'rolled_back'
      - `execution_time_ms` (integer) - Time taken to execute migration in milliseconds
      - `error_message` (text, nullable) - Error message if migration failed
      - `created_at` (timestamptz) - Record creation timestamp

  3. Security
    - Enable RLS on `schema_migrations` table
    - Only service role can insert/update migration records
    - Authenticated users can read migration history for transparency
    - Public cannot access migration records

  4. Indexes
    - Unique index on filename to prevent duplicate entries
    - Index on applied_at for quick chronological queries
    - Index on status for filtering by migration state

  5. Important Notes
    - This table is managed by the automated migration system
    - Do NOT manually insert or modify records unless absolutely necessary
    - The migration runner script will populate this table automatically
*/

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text UNIQUE NOT NULL,
  applied_at timestamptz DEFAULT now(),
  checksum text,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'failed', 'rolled_back')),
  execution_time_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON schema_migrations(status);

-- Enable RLS
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Service role can manage migrations" ON schema_migrations;
  DROP POLICY IF EXISTS "Authenticated users can read migration history" ON schema_migrations;
END $$;

-- Policy: Service role can do everything (for automated migrations)
CREATE POLICY "Service role can manage migrations"
  ON schema_migrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read migration history
CREATE POLICY "Authenticated users can read migration history"
  ON schema_migrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment to table for documentation
COMMENT ON TABLE schema_migrations IS 'Tracks database migrations applied by the automated migration system. Managed automatically - do not modify manually.';
COMMENT ON COLUMN schema_migrations.filename IS 'Unique migration filename from supabase/migrations/ directory';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA-256 hash of migration file content for integrity verification';
COMMENT ON COLUMN schema_migrations.status IS 'Current status: applied, failed, or rolled_back';
