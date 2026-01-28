#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

config();

interface MigrationRecord {
  filename: string;
  applied_at: string;
  status: string;
}

interface MigrationResult {
  filename: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  executionTime?: number;
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL or VITE_SUPABASE_URL environment variable is required');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for migrations');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function executeSqlDirect(supabaseUrl: string, serviceKey: string, sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function getAppliedMigrations(supabase: ReturnType<typeof createClient>): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('filename')
      .eq('status', 'applied');

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('⚠️  Migration tracking table does not exist yet. Will apply all migrations.');
        return new Set();
      }
      throw error;
    }

    return new Set((data || []).map((record: MigrationRecord) => record.filename));
  } catch (err) {
    console.log('⚠️  Could not read migration history. Will apply all migrations.');
    return new Set();
  }
}

async function recordMigration(
  supabase: ReturnType<typeof createClient>,
  filename: string,
  checksum: string,
  status: 'applied' | 'failed',
  executionTime?: number,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('schema_migrations')
      .upsert({
        filename,
        checksum,
        status,
        execution_time_ms: executionTime,
        error_message: errorMessage,
        applied_at: new Date().toISOString(),
      }, {
        onConflict: 'filename'
      });

    if (error) {
      console.error(`⚠️  Failed to record migration ${filename}:`, error.message);
    }
  } catch (err) {
    console.error(`⚠️  Failed to record migration ${filename}:`, err);
  }
}

async function executeMigration(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  filename: string,
  sqlContent: string,
  checksum: string
): Promise<{ success: boolean; executionTime: number; error?: string }> {
  const startTime = Date.now();

  const result = await executeSqlDirect(supabaseUrl, serviceKey, sqlContent);
  const executionTime = Date.now() - startTime;

  if (result.success) {
    await recordMigration(supabase, filename, checksum, 'applied', executionTime);
    return { success: true, executionTime };
  } else {
    await recordMigration(supabase, filename, checksum, 'failed', executionTime, result.error);
    return { success: false, executionTime, error: result.error };
  }
}

async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...\n');

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.log('⚠️  Supabase credentials not found. Skipping migrations.');
      console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable automatic migrations.\n');
      return;
    }

    const supabase = getSupabaseClient();

    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('✅ No migration files found. Database is up to date.\n');
      return;
    }

    console.log(`📁 Found ${migrationFiles.length} migration file(s)\n`);

    const appliedMigrations = await getAppliedMigrations(supabase);
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.has(file));

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations already applied. Database is up to date.\n');
      return;
    }

    console.log(`📋 Applying ${pendingMigrations.length} pending migration(s)...\n`);

    const results: MigrationResult[] = [];
    let hasErrors = false;

    for (const filename of pendingMigrations) {
      const filePath = join(MIGRATIONS_DIR, filename);
      const sqlContent = readFileSync(filePath, 'utf-8');
      const checksum = calculateChecksum(sqlContent);

      console.log(`  📄 ${filename}`);

      const result = await executeMigration(
        supabase,
        supabaseUrl,
        serviceKey,
        filename,
        sqlContent,
        checksum
      );

      if (result.success) {
        console.log(`     ✅ Success (${result.executionTime}ms)\n`);
        results.push({
          filename,
          status: 'success',
          executionTime: result.executionTime
        });
      } else {
        console.error(`     ❌ Failed (${result.executionTime}ms)`);
        console.error(`     Error: ${result.error}\n`);
        results.push({
          filename,
          status: 'failed',
          error: result.error,
          executionTime: result.executionTime
        });
        hasErrors = true;
        break;
      }
    }

    console.log('─'.repeat(60));
    console.log('📊 Migration Summary');
    console.log('─'.repeat(60));

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`   ✅ Successful: ${successful}`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}`);
    }

    const totalTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    console.log(`   ⏱️  Total time: ${totalTime}ms`);
    console.log('─'.repeat(60) + '\n');

    if (hasErrors) {
      console.error('❌ Migration process failed. Please fix the errors and try again.\n');
      process.exit(1);
    } else {
      console.log('✅ All migrations completed successfully!\n');
    }

  } catch (error) {
    console.error('❌ Migration process failed:');
    console.error('   ', error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  runMigrations().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

export { runMigrations };
