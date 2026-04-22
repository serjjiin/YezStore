import { createBrowserClient } from '@supabase/ssr'

// Cliente Supabase para Client Components.
// Usa localStorage para persistir a sessão no browser.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
