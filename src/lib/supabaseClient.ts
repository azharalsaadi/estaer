import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your project's values."
  )
}

/**
 * The ONLY module allowed to call the Supabase SDK directly. Every other
 * part of the app — pages, components, hooks — goes through a feature's
 * `apis/*.api.ts` file, which imports this client, calls the SDK, and
 * returns application-owned types/errors (see types/api.types.ts). No
 * Supabase type, query builder, or raw SDK response may cross that
 * boundary. See docs/STRUCTURE.md "Access layer".
 *
 * The publishable key is the low-privilege "anon" key — safe to ship in
 * the browser bundle. It does not replace Row Level Security; every table
 * it can reach still has RLS policies restricting what it may read/write.
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabasePublishableKey)
