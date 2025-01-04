import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// العميل العادي
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// عميل بصلاحيات كاملة
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey) 