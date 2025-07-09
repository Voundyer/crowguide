import { supabase } from "./supabase"
import type { Topic, UserProgress, ChecklistItem, UserStats } from "./supabase"

export async function getTopics(): Promise<Topic[]> {
  try {
    const { data, error } = await supabase.from("topics").select("*").order("phase_order", { ascending: true })

    if (error) {
      console.error("Error fetching topics:", error)
      // Return empty array if table doesn't exist yet
      if (error.code === "42P01") {
        console.warn("Topics table doesn't exist yet. Please run the database setup script.")
        return []
      }
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error in getTopics:", error)
    return []
  }
}

export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const { data, error } = await supabase.from("user_progress").select("*").eq("user_id", userId)

    if (error) {
      console.error("Error fetching user progress:", error)
      // Return empty array if table doesn't exist yet
      if (error.code === "42P01") {
        console.warn("User progress table doesn't exist yet. Please run the database setup script.")
        return []
      }
      throw error
    }
    return data || []
  } catch (error) {
    console.error("Error in getUserProgress:", error)
    return []
  }
}

export async function updateProgress(userId: string, topicId: string, updates: Partial<UserProgress>) {
  if (!userId || !topicId) {
    throw new Error("User ID and Topic ID are required")
  }

  console.log("Updating progress:", { userId, topicId, updates })

  try {
    // First, try to get existing progress
    const { data: existing, error: fetchError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116" && fetchError.code !== "42P01") {
      console.error("Error fetching existing progress:", fetchError)
      throw fetchError
    }

    // If table doesn't exist, throw a helpful error
    if (fetchError && fetchError.code === "42P01") {
      throw new Error("Database tables not set up. Please run the database setup script first.")
    }

    const progressData = {
      user_id: userId,
      topic_id: topicId,
      completed: updates.completed || false,
      notes: updates.notes || "",
      study_time: (existing?.study_time || 0) + (updates.study_time || 0),
      last_studied: new Date().toISOString(),
    }

    let result
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("user_progress")
        .update(progressData)
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .select()

      result = { data, error }
    } else {
      // Insert new record
      const { data, error } = await supabase.from("user_progress").insert(progressData).select()

      result = { data, error }
    }

    if (result.error) {
      console.error("Error updating progress:", result.error)
      throw result.error
    }

    console.log("Progress updated successfully:", result.data)
    return result.data
  } catch (error) {
    console.error("Error in updateProgress:", error)
    throw error
  }
}

export async function getChecklistItems(userId: string, topicId: string): Promise<ChecklistItem[]> {
  if (!userId || !topicId) {
    throw new Error("User ID and Topic ID are required")
  }

  try {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .order("created_at")

    if (error) {
      console.error("Error fetching checklist items:", error)
      // Return empty array if table doesn't exist yet
      if (error.code === "42P01") {
        console.warn("Checklist items table doesn't exist yet. Please run the database setup script.")
        return []
      }
      throw error
    }
    return data || []
  } catch (error) {
    console.error("Error in getChecklistItems:", error)
    return []
  }
}

export async function addChecklistItem(userId: string, topicId: string, content: string) {
  if (!userId || !topicId || !content.trim()) {
    throw new Error("User ID, Topic ID, and content are required")
  }

  try {
    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        user_id: userId,
        topic_id: topicId,
        content: content.trim(),
      })
      .select()

    if (error) {
      console.error("Error adding checklist item:", error)
      if (error.code === "42P01") {
        throw new Error("Database tables not set up. Please run the database setup script first.")
      }
      throw error
    }
    return data
  } catch (error) {
    console.error("Error in addChecklistItem:", error)
    throw error
  }
}

export async function updateChecklistItem(itemId: string, updates: Partial<ChecklistItem>) {
  if (!itemId) {
    throw new Error("Item ID is required")
  }

  const { data, error } = await supabase.from("checklist_items").update(updates).eq("id", itemId).select()

  if (error) {
    console.error("Error updating checklist item:", error)
    throw error
  }
  return data
}

export async function deleteChecklistItem(itemId: string) {
  if (!itemId) {
    throw new Error("Item ID is required")
  }

  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId)

  if (error) {
    console.error("Error deleting checklist item:", error)
    throw error
  }
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const { data, error } = await supabase.from("user_stats").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      console.error("Error fetching user stats:", error)
      throw error
    }

    // Return null if table doesn't exist or no data found
    if (error && error.code === "42P01") {
      console.warn("User stats table doesn't exist yet. Please run the database setup script.")
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getUserStats:", error)
    return null
  }
}

export async function updateUserStats(userId: string, updates: Partial<UserStats>) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  console.log("Updating user stats:", { userId, updates })

  try {
    // First, try to get existing stats
    const { data: existing, error: fetchError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116" && fetchError.code !== "42P01") {
      console.error("Error fetching existing stats:", fetchError)
      throw fetchError
    }

    // If table doesn't exist, throw a helpful error
    if (fetchError && fetchError.code === "42P01") {
      throw new Error("Database tables not set up. Please run the database setup script first.")
    }

    const statsData = {
      user_id: userId,
      total_study_time: updates.total_study_time || existing?.total_study_time || 0,
      current_streak: updates.current_streak || existing?.current_streak || 0,
      last_study_date: updates.last_study_date || existing?.last_study_date,
      total_notes: updates.total_notes || existing?.total_notes || 0,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing) {
      // Update existing record
      const { data, error } = await supabase.from("user_stats").update(statsData).eq("user_id", userId).select()

      result = { data, error }
    } else {
      // Insert new record
      const { data, error } = await supabase.from("user_stats").insert(statsData).select()

      result = { data, error }
    }

    if (result.error) {
      console.error("Error updating user stats:", result.error)
      throw result.error
    }

    console.log("User stats updated successfully:", result.data)
    return result.data
  } catch (error) {
    console.error("Error in updateUserStats:", error)
    throw error
  }
}

// Helper function to check if user is authenticated
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error("Error getting current user:", error)
    throw error
  }

  return user
}

// Helper function to ensure user exists in our users table
export async function ensureUserExists(userId: string, email: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .upsert({
        id: userId,
        email,
        updated_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error ensuring user exists:", error)
      // If users table doesn't exist, that's okay for now
      if (error.code === "42P01") {
        console.warn("Users table doesn't exist yet. Please run the database setup script.")
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in ensureUserExists:", error)
    return null
  }
}
