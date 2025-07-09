import { supabase } from "./supabase"

export interface LearningPathRequest {
  topic: string
  experience?: string
  goals?: string
  timeframe?: string
}

export interface GeneratedTopic {
  id: string
  title: string
  description?: string
}

export interface GeneratedPhase {
  title: string
  description: string
  duration: string
  topics: GeneratedTopic[]
}

export interface GeneratedLearningPath {
  title: string
  description: string
  difficulty: string
  estimatedDuration: string
  phases: GeneratedPhase[]
}

export async function generateLearningPath(request: LearningPathRequest): Promise<GeneratedLearningPath> {
  try {
    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      throw new Error("You must be logged in to generate learning paths")
    }

    console.log("Making request with user ID:", session.user.id)

    const response = await fetch("/api/generate-learning-path", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...request,
        userId: session.user.id,
      }),
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("API Error:", errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const { learningPath } = await response.json()
    return learningPath
  } catch (error) {
    console.error("Error generating learning path:", error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Failed to generate learning path. Please try again.")
  }
}

export async function saveLearningPath(userId: string, learningPath: GeneratedLearningPath) {
  if (!userId || !learningPath) {
    throw new Error("User ID and learning path are required")
  }

  try {
    // Create a unique identifier for this learning path
    const pathId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Save the learning path metadata
    const { error: pathError } = await supabase.from("learning_paths").insert({
      id: pathId,
      user_id: userId,
      title: learningPath.title,
      description: learningPath.description,
      difficulty: learningPath.difficulty,
      estimated_duration: learningPath.estimatedDuration,
      is_custom: true,
      created_at: new Date().toISOString(),
    })

    if (pathError) {
      console.error("Error saving learning path:", pathError)
      throw pathError
    }

    // Save all topics from all phases
    const topicsToInsert = []
    let topicOrder = 0

    for (const [phaseIndex, phase] of learningPath.phases.entries()) {
      for (const topic of phase.topics) {
        topicsToInsert.push({
          id: `${pathId}-${topic.id}`,
          title: topic.title,
          phase: `phase-${phaseIndex + 1}`,
          category: phase.title,
          description: topic.description || `Learn ${topic.title} as part of ${phase.title}`,
          learning_path_id: pathId,
          phase_order: phaseIndex,
          topic_order: topicOrder++,
        })
      }
    }

    // Insert topics
    const { error: topicsError } = await supabase.from("topics").insert(topicsToInsert)

    if (topicsError) {
      console.error("Error saving topics:", topicsError)
      throw topicsError
    }

    return pathId
  } catch (error) {
    console.error("Error in saveLearningPath:", error)
    throw error
  }
}

export async function getUserLearningPaths(userId: string) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  const { data, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user learning paths:", error)
    throw error
  }

  return data || []
}

export async function getTopicsByLearningPath(learningPathId: string, userId?: string) {
  // First verify the learning path belongs to the user (if userId provided)
  if (userId) {
    const { data: pathData, error: pathError } = await supabase
      .from("learning_paths")
      .select("user_id")
      .eq("id", learningPathId)
      .single()

    if (pathError) {
      console.error("Error verifying learning path ownership:", pathError)
      throw pathError
    }

    if (pathData.user_id !== userId) {
      throw new Error("Access denied: This learning path belongs to another user")
    }
  }

  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("learning_path_id", learningPathId)
    .order("phase_order, topic_order")

  if (error) {
    console.error("Error fetching topics by learning path:", error)
    throw error
  }

  return data || []
}
