# Automatic Database Migrations

This project includes an automatic database migration system that runs on every build.

## How It Works

1. **Migration Files**: All SQL migration files are stored in `supabase/migrations/` directory
2. **Tracking**: The `schema_migrations` table tracks which migrations have been applied
3. **Automatic Execution**: Every time you run `npm run build`, migrations automatically execute before the build
4. **Idempotent**: The system only applies migrations that haven't been run yet

## Setup

### Required Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Getting Your Service Role Key

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** > **API**
4. Copy the `service_role` key (keep this secret!)
5. Add it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`

**⚠️ Important**: The service role key has admin privileges. Never expose it in client-side code or commit it to version control.

## Manual Migration

You can also run migrations manually without building:

```bash
npm run migrate
```

This is useful for:
- Testing new migrations
- Updating the database during development
- Troubleshooting migration issues

## Creating New Migrations

### Using Supabase MCP Tools

The recommended way is to use the `mcp__supabase__apply_migration` tool with detailed documentation:

```typescript
mcp__supabase__apply_migration({
  filename: 'descriptive_migration_name',
  content: `
    /*
      # Migration Title

      1. Purpose
        - Describe what this migration does

      2. Changes
        - List tables/columns being added/modified

      3. Security
        - Describe RLS policies
    */

    CREATE TABLE IF NOT EXISTS my_table (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
  `
})
```

### Manual File Creation

You can also create migration files manually in `supabase/migrations/`:

1. Create a new `.sql` file with format: `YYYYMMDDHHMMSS_description.sql`
2. Write your SQL with proper safety checks (`IF NOT EXISTS`, etc.)
3. Include RLS policies for new tables
4. Run `npm run migrate` to test

## Migration Best Practices

### 1. Always Use Safety Checks

```sql
CREATE TABLE IF NOT EXISTS users (...);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email text;
```

### 2. Enable RLS on All Tables

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

### 3. Never Use Destructive Operations

Avoid operations that lose data:
- `DROP TABLE` (use `DROP TABLE IF EXISTS` only when absolutely necessary)
- `DROP COLUMN` (creates permanent data loss)
- Changing column types without data migration

### 4. Make Migrations Idempotent

Migrations should be safe to run multiple times:

```sql
-- Good: Won't fail if column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text;
  END IF;
END $$;
```

## Migration Workflow

### Development

1. Make schema changes using migrations
2. Test with `npm run migrate`
3. Verify in Supabase dashboard
4. Commit migration files to git

### Production Builds

1. Push code to your deployment platform
2. Build process runs automatically
3. Migrations execute before build
4. Build fails if migrations fail (safe!)
5. Application deploys with updated schema

## Troubleshooting

### Migrations Not Running

**Symptom**: Migrations are skipped during build

**Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your environment

### Migration Failed

**Symptom**: Build fails with migration error

**Solution**:
1. Check the error message in build logs
2. Fix the SQL syntax or logic error
3. If needed, create a new migration to fix the issue
4. Never edit migration files that have already been applied

### Table Already Exists Error

**Symptom**: `ERROR: relation "table_name" already exists`

**Solution**: Always use `IF NOT EXISTS` in your migrations:

```sql
CREATE TABLE IF NOT EXISTS my_table (...);
```

### Service Role Permission Error

**Symptom**: `permission denied` errors during migration

**Solution**: The migration system uses service role which should have all permissions. Check:
1. Service role key is correct
2. The `exec_sql` function exists in your database
3. Service role has EXECUTE permission on `exec_sql`

## Database Functions

The migration system uses a special function:

### `exec_sql(sql text)`

- Executes arbitrary SQL statements
- Only accessible by service role
- Used internally by the migration runner
- Do not call this function directly

## Security Notes

1. **Service Role Key**: Keep it secret, never commit to git
2. **RLS Required**: Always enable RLS on new tables
3. **Policy Review**: Review all policies before deploying
4. **Audit Trail**: Check `schema_migrations` table for migration history

## Migration Table Schema

The `schema_migrations` table tracks all applied migrations:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Unique identifier |
| filename | text | Migration filename |
| applied_at | timestamptz | When migration was applied |
| checksum | text | SHA-256 hash of file content |
| status | text | 'applied', 'failed', or 'rolled_back' |
| execution_time_ms | integer | Time taken to execute |
| error_message | text | Error if migration failed |

Query migration history:

```sql
SELECT filename, applied_at, execution_time_ms, status
FROM schema_migrations
ORDER BY applied_at DESC;
```

## Advanced Usage

### Dry Run Mode

To see what migrations would run without executing them, you can temporarily modify the script or check the database directly:

```sql
-- See pending migrations
SELECT * FROM schema_migrations
WHERE status = 'applied'
ORDER BY applied_at;
```

### Rolling Back Migrations

The system doesn't support automatic rollbacks. If you need to undo a migration:

1. Create a new migration that reverses the changes
2. Name it appropriately (e.g., `rollback_feature_x.sql`)
3. Apply it using the normal migration process

### Skip Migrations During Build

If you need to build without running migrations:

```bash
# Build directly without prebuild hook
npm run build:skip-migrations

# Or set an environment variable
SKIP_MIGRATIONS=true npm run build
```

Note: You'll need to add support for this in package.json scripts if needed.

## Support

For issues or questions:
1. Check the migration logs during build
2. Review the `schema_migrations` table
3. Ensure all environment variables are set correctly
4. Test migrations locally before deploying
