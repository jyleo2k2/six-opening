import { createClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

export const hasSupabase = Boolean(url && key)

// 키가 없으면 null. 이 경우 앱은 "로컬 전용 모드"로 돌아가며 수집은 그대로 보여줌.
export const supabase = hasSupabase ? createClient(url, key) : null
