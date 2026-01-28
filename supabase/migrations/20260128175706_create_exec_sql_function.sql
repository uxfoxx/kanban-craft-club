/*
  # Create SQL Execution Function for Migrations

  1. Purpose
    - Create a PostgreSQL function to execute arbitrary SQL statements
    - Used by the automated migration system to apply database changes
    - Restricted to service role for security

  2. New Functions
    - `exec_sql(sql text)`
      - Executes the provided SQL statement
      - Returns void
      - Only accessible by service role

  3. Security
    - Function is marked as SECURITY DEFINER to run with elevated privileges
    - Only service role can call this function (enforced by RLS on invoking)
    - No public access to prevent SQL injection attacks

  4. Important Notes
    - This function is critical for the automated migration system
    - Do NOT modify or drop this function without updating the migration runner
    - All SQL executed through this function runs with superuser privileges
*/

-- Drop the function if it already exists
DROP FUNCTION IF EXISTS exec_sql(text);

-- Create the exec_sql function
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Revoke all default permissions
REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION exec_sql(text) FROM authenticated;

-- Grant execute permission only to service_role
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- Add function comment
COMMENT ON FUNCTION exec_sql(text) IS 'Executes arbitrary SQL statements. Used by automated migration system. Service role only.';
