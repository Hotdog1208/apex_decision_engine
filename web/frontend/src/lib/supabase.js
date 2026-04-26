import { createClient } from '@supabase/supabase-js'

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const _supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey

if (_supabaseMisconfigured) {
  console.error(
    '[ADE] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.\n' +
    'Local dev: copy web/frontend/.env.example → .env.local and fill in values.\n' +
    'Vercel: add both vars under Project → Settings → Environment Variables, then redeploy.'
  )
}

// createClient throws on empty strings in supabase-js v2.104+.
// Use placeholder values when env vars are missing so the module loads
// without crashing — the app renders in logged-out / read-only state
// and all auth calls fail gracefully with network errors instead of a blank screen.
export const supabase = createClient(
  supabaseUrl    || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key-not-real',
  {
    auth: {
      autoRefreshToken:  !_supabaseMisconfigured,
      persistSession:    !_supabaseMisconfigured,
      detectSessionInUrl: !_supabaseMisconfigured,
      flowType: 'pkce',
    },
  }
)
