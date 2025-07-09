import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

export interface LearningPathRequest {
  topic: string
  experience?: string
  goals?: string
  timeframe?: string
  userId: string
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

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "AI service is not configured. Please contact support." }, { status: 500 })
    }

    const body: LearningPathRequest = await request.json()
    const { topic, experience, goals, timeframe, userId } = body

    // Validate required fields
    if (!topic || !userId) {
      return NextResponse.json({ error: "Topic and user ID are required" }, { status: 400 })
    }

    // For now, let's simplify the auth check
    // In production, you'd want more robust authentication
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Basic validation - in production you'd verify the session properly
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const prompt = `You are an expert learning path designer with access to current information about technology trends and best practices. Create a comprehensive, structured learning roadmap for someone who wants to learn: "${topic}"

Context:
- Experience level: ${experience || "Not specified"}
- Learning goals: ${goals || "Not specified"}
- Preferred timeframe: ${timeframe || "Not specified"}
- Current year: ${new Date().getFullYear()}

Please create a detailed, up-to-date learning path that considers:
- Latest industry trends and tools
- Modern best practices
- Current job market demands
- Popular frameworks and libraries as of 2024/2025

Structure your response as follows:

1. **Title**: A clear, engaging title for the learning path
2. **Description**: A brief overview of what the learner will achieve
3. **Difficulty**: Beginner, Intermediate, or Advanced
4. **Estimated Duration**: Total time needed (e.g., "3-6 months")
5. **Phases**: Break down the learning into 4-8 logical phases, each containing:
   - Phase title
   - Phase description
   - Duration for this phase
   - 5-10 specific topics/skills to learn in this phase

Make sure the path is:
- Logically structured (building from fundamentals to advanced concepts)
- Practical and actionable with hands-on projects
- Includes modern tools and frameworks
- Considers current industry standards
- Tailored to the user's experience level and goals
- Includes real-world applications and portfolio projects

Respond with a valid JSON object matching this exact structure:

{
  "title": "Learning Path Title",
  "description": "Brief description of what the learner will achieve",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedDuration": "X months",
  "phases": [
    {
      "title": "Phase Title",
      "description": "What this phase covers",
      "duration": "X weeks",
      "topics": [
        {
          "id": "unique-topic-id",
          "title": "Topic Title",
          "description": "Brief description of what to learn"
        }
      ]
    }
  ]
}

Ensure the JSON is valid and properly formatted.`

    const { text } = await generateText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    })

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid response from AI service" }, { status: 500 })
    }

    const learningPath = JSON.parse(jsonMatch[0]) as GeneratedLearningPath

    // Validate the structure
    if (!learningPath.title || !learningPath.phases || !Array.isArray(learningPath.phases)) {
      return NextResponse.json({ error: "Invalid learning path structure" }, { status: 500 })
    }

    // Ensure all phases have topics
    for (const phase of learningPath.phases) {
      if (!phase.topics || !Array.isArray(phase.topics) || phase.topics.length === 0) {
        return NextResponse.json({ error: `Phase "${phase.title}" has no topics` }, { status: 500 })
      }
    }

    return NextResponse.json({ learningPath })
  } catch (error) {
    console.error("Error generating learning path:", error)

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json({ error: "AI service configuration error" }, { status: 500 })
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again in a few minutes." },
          { status: 429 },
        )
      }
      if (error.message.includes("quota")) {
        return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 })
      }
    }

    return NextResponse.json({ error: "Failed to generate learning path. Please try again." }, { status: 500 })
  }
}
