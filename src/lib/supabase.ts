import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos nas variáveis de ambiente.')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
