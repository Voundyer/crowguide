import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Topic = {
  id: string
  title: string
  phase: string
  category: string
  description: string
  learning_path_id?: string
  phase_order?: number
  topic_order?: number
  created_at?: string
}

export type UserProgress = {
  id: string
  user_id: string
  topic_id: string
  completed: boolean
  notes: string
  study_time: number
  last_studied: string
  created_at?: string
}

export type ChecklistItem = {
  id: string
  user_id: string
  topic_id: string
  content: string
  completed: boolean
  created_at?: string
}

export type UserStats = {
  id: string
  user_id: string
  total_study_time: number
  current_streak: number
  last_study_date: string
  total_notes: number
  created_at?: string
  updated_at?: string
}

export type LearningPath = {
  id: string
  user_id: string
  title: string
  description: string
  difficulty: string
  estimated_duration: string
  is_custom: boolean
  created_at: string
  updated_at: string
}
