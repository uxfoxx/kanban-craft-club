// This file provides a safe, stable import path for the backend client.
// We avoid modifying the auto-generated integrations/supabase/client.ts directly.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type AnyEnv = ImportMetaEnv & Record<string, string | boolean | undefined>;
const env = import.meta.env as AnyEnv;

// Public fallbacks to prevent a blank screen if env injection is missing.
const DEFAULT_URL = "https://nexahtdtctnhylfjatix.supabase.co";
const DEFAULT_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5leGFodGR0Y3RuaHlsZmphdGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzE3MzMsImV4cCI6MjA4NDI0NzczM30.5e8IqSZD06Z5f5ZAb2-iEHC9CHGXIDq0jVt5VcEJ4wc";

const SUPABASE_URL =
  (typeof env.VITE_SUPABASE_URL === "string" && env.VITE_SUPABASE_URL) ||
  (typeof env.SUPABASE_URL === "string" && env.SUPABASE_URL) ||
  DEFAULT_URL;

const SUPABASE_ANON_KEY =
  (typeof env.VITE_SUPABASE_ANON_KEY === "string" && env.VITE_SUPABASE_ANON_KEY) ||
  (typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === "string" && env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof env.SUPABASE_PUBLISHABLE_KEY === "string" && env.SUPABASE_PUBLISHABLE_KEY) ||
  DEFAULT_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
