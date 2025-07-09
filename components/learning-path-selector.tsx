"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Clock, Target, Sparkles } from "lucide-react"
import { getUserLearningPaths, getTopicsByLearningPath } from "@/lib/ai-generator"
import { useToast } from "@/hooks/use-toast"
import { getUserProgress } from "@/lib/database"

interface LearningPath {
  id: string
  title: string
  description: string
  difficulty: string
  estimated_duration: string
  is_custom: boolean
  created_at: string
}

interface LearningPathSelectorProps {
  userId: string
  selectedPathId: string | null
  onPathSelect: (pathId: string | null) => void
  refreshTrigger?: number
}

export default function LearningPathSelector({
  userId,
  selectedPathId,
  onPathSelect,
  refreshTrigger,
}: LearningPathSelectorProps) {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [pathProgress, setPathProgress] = useState<
    Record<string, { completed: number; total: number; percentage: number }>
  >({})

  useEffect(() => {
    loadLearningPaths()
  }, [userId, refreshTrigger])

  const loadLearningPaths = async () => {
    try {
      const paths = await getUserLearningPaths(userId)
      setLearningPaths(paths)
    } catch (error) {
      console.error("Error loading learning paths:", error)
      toast({
        title: "Error",
        description: "Failed to load learning paths",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePathSelect = (pathId: string) => {
    onPathSelect(pathId)
  }

  const getPathProgress = async (pathId: string) => {
    try {
      const pathTopics = await getTopicsByLearningPath(pathId, userId)
      const pathProgress = await getUserProgress(userId)

      const pathTopicIds = pathTopics.map((t) => t.id)
      const completedCount = pathProgress.filter((p) => pathTopicIds.includes(p.topic_id) && p.completed).length

      return {
        completed: completedCount,
        total: pathTopics.length,
        percentage: pathTopics.length > 0 ? Math.round((completedCount / pathTopics.length) * 100) : 0,
      }
    } catch (error) {
      return { completed: 0, total: 0, percentage: 0 }
    }
  }

  useEffect(() => {
    const loadPathProgress = async () => {
      const progressData: Record<string, { completed: number; total: number; percentage: number }> = {}

      for (const path of learningPaths) {
        progressData[path.id] = await getPathProgress(path.id)
      }

      setPathProgress(progressData)
    }

    if (learningPaths.length > 0) {
      loadPathProgress()
    }
  }, [learningPaths, userId])

  if (loading) {
    return <div className="text-center py-4">Loading learning paths...</div>
  }

  return (
    <div className="space-y-4">
      {learningPaths.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Select value={selectedPathId || ""} onValueChange={handlePathSelect}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select a learning path" />
            </SelectTrigger>
            <SelectContent>
              {learningPaths.map((path) => (
                <SelectItem key={path.id} value={path.id}>
                  {path.title} 🤖
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {learningPaths.length === 0 && (
        <Card className="border-dashed border-2 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🐦‍⬛</div>
            <h3 className="text-2xl font-bold mb-3">Welcome to Crowguide!</h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Your AI-powered learning companion is ready to create personalized learning paths just for you.
            </p>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-2 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Get Started in 3 Steps
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>1. Click "Generate AI Learning Path" above</p>
                <p>2. Tell us what you want to learn</p>
                <p>3. Get your personalized roadmap instantly!</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              No generic courses - every path is tailored to your experience level and goals.
            </p>
          </CardContent>
        </Card>
      )}

      {learningPaths.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {learningPaths.map((path) => {
            const progress = pathProgress[path.id] || { completed: 0, total: 0, percentage: 0 }

            return (
              <Card
                key={path.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPathId === path.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => onPathSelect(path.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {path.title}
                        <span className="text-sm">🤖</span>
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">{path.description}</CardDescription>
                    </div>
                  </div>
                  {/* Progress bar for each path */}
                  {progress.total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>
                          {progress.completed}/{progress.total} topics
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      {path.difficulty}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {path.estimated_duration}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                    {progress.percentage > 0 && (
                      <Badge variant="default" className="text-xs">
                        {progress.percentage}% Complete
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
