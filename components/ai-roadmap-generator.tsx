"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Plus, BookOpen, Target, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateLearningPath, saveLearningPath } from "@/lib/ai-generator"
import type { GeneratedLearningPath } from "@/lib/ai-generator"

interface AIRoadmapGeneratorProps {
  userId: string
  onPathGenerated: () => void
}

export default function AIRoadmapGenerator({ userId, onPathGenerated }: AIRoadmapGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [topic, setTopic] = useState("")
  const [experience, setExperience] = useState("")
  const [goals, setGoals] = useState("")
  const [timeframe, setTimeframe] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedPath, setGeneratedPath] = useState<GeneratedLearningPath | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter what you want to learn",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      const path = await generateLearningPath({
        topic: topic.trim(),
        experience: experience.trim(),
        goals: goals.trim(),
        timeframe: timeframe.trim(),
      })

      setGeneratedPath(path)
      toast({
        title: "Learning path generated! 🎉",
        description: `Created a personalized roadmap for ${topic}`,
      })
    } catch (error: any) {
      console.error("Error generating learning path:", error)
      toast({
        title: "Error",
        description: `Failed to generate learning path: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedPath) return

    setSaving(true)
    try {
      await saveLearningPath(userId, generatedPath)
      toast({
        title: "Learning path saved! ✅",
        description: "Your personalized roadmap has been added to your dashboard",
      })

      // Reset form and close dialog
      setTopic("")
      setExperience("")
      setGoals("")
      setTimeframe("")
      setGeneratedPath(null)
      setIsOpen(false)

      // Refresh parent component
      onPathGenerated()
    } catch (error: any) {
      console.error("Error saving learning path:", error)
      toast({
        title: "Error",
        description: `Failed to save learning path: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setTopic("")
    setExperience("")
    setGoals("")
    setTimeframe("")
    setGeneratedPath(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate AI Learning Path
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            <span className="text-lg sm:text-xl">AI Learning Path Generator</span>
          </DialogTitle>
          <p className="text-muted-foreground text-sm sm:text-base">
            Let AI create a personalized learning roadmap based on your goals and experience level
          </p>
        </DialogHeader>

        {!generatedPath ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">What do you want to learn? *</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., JavaScript, Machine Learning, React, Python..."
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your experience level</label>
                <Input
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g., Complete beginner, Some programming experience..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your learning goals</label>
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g., Build web applications, Get a job as a developer, Create personal projects..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred timeframe</label>
              <Input
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="e.g., 3 months, 6 months, 1 year..."
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleGenerate} disabled={generating || !topic.trim()} className="flex-1">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Learning Path
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForm} className="sm:w-auto">
                Reset
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">{generatedPath.title}</h3>
              <p className="text-muted-foreground mb-4">{generatedPath.description}</p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {generatedPath.estimatedDuration}
                </Badge>
                <Badge variant="secondary">
                  <Target className="w-3 h-3 mr-1" />
                  {generatedPath.difficulty}
                </Badge>
                <Badge variant="secondary">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {generatedPath.phases.length} Phases
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {generatedPath.phases.map((phase, phaseIndex) => (
                <Card key={phaseIndex}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {phaseIndex + 1}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{phase.title}</CardTitle>
                        <CardDescription>{phase.duration}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{phase.description}</p>
                    <div className="space-y-2">
                      {phase.topics.map((topic, topicIndex) => (
                        <div key={topicIndex} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{topic.title}</div>
                            {topic.description && (
                              <div className="text-xs text-muted-foreground mt-1">{topic.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to My Learning Paths
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setGeneratedPath(null)} className="sm:w-auto">
                Generate New Path
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
