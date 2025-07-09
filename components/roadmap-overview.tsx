"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { getUserProgress, getUserStats } from "@/lib/database"
import { getTopicsByLearningPath } from "@/lib/ai-generator"
import type { Topic, UserProgress, UserStats } from "@/lib/supabase"
import { Sparkles, Database } from "lucide-react"

interface RoadmapOverviewProps {
  userId: string
  onTopicClick: (Topic) => void
  refreshTrigger?: number
  selectedLearningPath?: string | null
}

const phaseConfig = {
  // Dynamic phases for custom learning paths
  "phase-1": {
    icon: "1️⃣",
    title: "Phase 1",
    duration: "Custom",
    color: "from-blue-400 to-purple-500",
  },
  "phase-2": {
    icon: "2️⃣",
    title: "Phase 2",
    duration: "Custom",
    color: "from-purple-400 to-pink-500",
  },
  "phase-3": {
    icon: "3️⃣",
    title: "Phase 3",
    duration: "Custom",
    color: "from-pink-400 to-red-500",
  },
  "phase-4": {
    icon: "4️⃣",
    title: "Phase 4",
    duration: "Custom",
    color: "from-red-400 to-orange-500",
  },
  "phase-5": {
    icon: "5️⃣",
    title: "Phase 5",
    duration: "Custom",
    color: "from-orange-400 to-yellow-500",
  },
  "phase-6": {
    icon: "6️⃣",
    title: "Phase 6",
    duration: "Custom",
    color: "from-yellow-400 to-green-500",
  },
  "phase-7": {
    icon: "7️⃣",
    title: "Phase 7",
    duration: "Custom",
    color: "from-green-400 to-teal-500",
  },
  "phase-8": {
    icon: "8️⃣",
    title: "Phase 8",
    duration: "Custom",
    color: "from-teal-400 to-blue-500",
  },
}

export default function RoadmapOverview({
  userId,
  onTopicClick,
  refreshTrigger,
  selectedLearningPath,
}: RoadmapOverviewProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      let topicsData: Topic[] = []

      if (selectedLearningPath) {
        // Load custom learning path topics with user verification
        topicsData = await getTopicsByLearningPath(selectedLearningPath, userId)
      }
      // No default topics - users must generate their own paths

      const [progressData, statsData] = await Promise.all([getUserProgress(userId), getUserStats(userId)])

      setTopics(topicsData)
      setProgress(progressData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : "Failed to load data")

      // If there's an access error, reset to empty state
      if (error instanceof Error && error.message.includes("Access denied")) {
        setTopics([])
        setProgress([])
        setStats(null)
      }
    } finally {
      setLoading(false)
    }
  }, [userId, selectedLearningPath])

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId, loadData, refreshTrigger])

  const getTopicProgress = (topicId: string) => {
    return progress.find((p) => p.topic_id === topicId)
  }

  const getPhaseProgress = (phase: string) => {
    const phaseTopics = topics.filter((t) => t.phase === phase)
    const completedTopics = phaseTopics.filter((t) => getTopicProgress(t.id)?.completed)
    return phaseTopics.length > 0 ? (completedTopics.length / phaseTopics.length) * 100 : 0
  }

  // Update overall progress to only count topics from current learning path
  const overallProgress =
    topics.length > 0
      ? (topics.filter((topic) => getTopicProgress(topic.id)?.completed).length / topics.length) * 100
      : 0

  // Update stats to be learning-path-specific
  const currentPathStats = {
    completedTopics: topics.filter((topic) => getTopicProgress(topic.id)?.completed).length,
    totalTopics: topics.length,
    studyTime: progress
      .filter((p) => topics.some((t) => t.id === p.topic_id))
      .reduce((total, p) => total + (p.study_time || 0), 0),
    notesCount: progress.filter((p) => topics.some((t) => t.id === p.topic_id) && p.notes && p.notes.trim().length > 0)
      .length,
  }

  const groupedTopics = topics.reduce(
    (acc, topic) => {
      if (!acc[topic.phase]) acc[topic.phase] = {}
      if (!acc[topic.phase][topic.category]) acc[topic.phase][topic.category] = []
      acc[topic.phase][topic.category].push(topic)
      return acc
    },
    {} as Record<string, Record<string, Topic[]>>,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your learning data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-2xl font-bold mb-3 text-destructive">Database Setup Required</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          It looks like the database tables haven't been set up yet. Please run the database setup script in your
          Supabase dashboard.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Database className="w-4 h-4" />
          <span>Error: {error}</span>
        </div>
      </div>
    )
  }

  // Show empty state if no learning path is selected
  if (!selectedLearningPath || topics.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-2xl font-bold mb-3">Ready to Start Learning?</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Generate your first AI-powered learning path to see your personalized roadmap, track progress, and achieve
          your goals.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>Click "Generate AI Learning Path" to get started</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Progress</CardTitle>
            <div className="text-3xl font-bold text-primary">{Math.round(overallProgress)}%</div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="mb-4" />
          <div className="text-sm text-muted-foreground">
            {currentPathStats.completedTopics} of {currentPathStats.totalTopics} topics completed in this learning path
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Learning Path Specific */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">{currentPathStats.completedTopics}</div>
            <div className="text-sm text-muted-foreground">Topics Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">{currentPathStats.studyTime}</div>
            <div className="text-sm text-muted-foreground">Minutes Studied</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.current_streak || 0}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">{currentPathStats.notesCount}</div>
            <div className="text-sm text-muted-foreground">Notes Created</div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(groupedTopics).map(([phaseKey, phaseTopics]) => {
          const config = phaseConfig[phaseKey as keyof typeof phaseConfig] || {
            icon: "📚",
            title: phaseKey.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            duration: "Custom",
            color: "from-gray-400 to-gray-500",
          }

          const phaseProgress = getPhaseProgress(phaseKey)

          return (
            <Card key={phaseKey} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.color}`} />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div className="flex-1">
                    <CardTitle>{config.title}</CardTitle>
                    <CardDescription>{config.duration}</CardDescription>
                  </div>
                  <Badge variant="secondary">{Math.round(phaseProgress)}%</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={phaseProgress} className="mb-4" />

                {Object.entries(phaseTopics).map(([category, categoryTopics]) => (
                  <div key={category} className="mb-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center">
                      <span className="text-primary mr-2">▶</span>
                      {category}
                    </h4>
                    <div className="space-y-1 pl-4">
                      {categoryTopics.map((topic) => {
                        const topicProgress = getTopicProgress(topic.id)
                        const isCompleted = topicProgress?.completed || false
                        const studyTime = topicProgress?.study_time || 0

                        return (
                          <div
                            key={topic.id}
                            onClick={() => onTopicClick(topic)}
                            className={`
                              p-2 rounded-md cursor-pointer transition-all duration-200 text-sm
                              hover:bg-primary/10 hover:translate-x-1
                              ${
                                isCompleted
                                  ? "bg-green-50 text-green-700 border-l-2 border-green-500"
                                  : "hover:bg-muted"
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span>{topic.title}</span>
                                {studyTime > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    📚 {studyTime} minutes studied
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {studyTime > 0 && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {studyTime}m
                                  </span>
                                )}
                                {isCompleted && <span className="text-green-600 font-bold">✓</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
