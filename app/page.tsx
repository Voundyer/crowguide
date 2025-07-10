"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import RoadmapOverview from "@/components/roadmap-overview"
import TopicFocus from "@/components/topic-focus"
import AIRoadmapGenerator from "@/components/ai-roadmap-generator"
import LearningPathSelector from "@/components/learning-path-selector"
import type { Topic, UserProgress } from "@/lib/supabase"
import { getUserProgress } from "@/lib/database"
import AuthForm from "@/components/auth-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Toaster } from "@/components/ui/toaster"
import Image from "next/image"

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedLearningPath, setSelectedLearningPath] = useState<string | null>(null)

  useEffect(() => {
    // Check for auth errors in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get("error")

    if (error) {
      switch (error) {
        case "auth_failed":
          setAuthError("Authentication failed. Please try again.")
          break
        case "no_session":
          setAuthError("No session found. Please try signing in again.")
          break
        case "unexpected":
          setAuthError("An unexpected error occurred. Please try again.")
          break
        default:
          setAuthError("An error occurred during sign in.")
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProgress = useCallback(async () => {
    if (!user) return
    try {
      const progress = await getUserProgress(user.id)
      setUserProgress(progress)
    } catch (error) {
      console.error("Error loading user progress:", error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadUserProgress()
    }
  }, [user, loadUserProgress])

  const handleProgressUpdate = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    loadUserProgress()
  }, [loadUserProgress])

  const handlePathGenerated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error("Error signing out:", error)
  }

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic)
  }

  const getTopicProgress = (topicId: string) => {
    return userProgress.find((p) => p.topic_id === topicId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        {authError && (
          <Alert className="fixed top-4 right-4 max-w-md">
            <AlertDescription>
              {authError}
              <button onClick={() => setAuthError(null)} className="ml-2 text-xs underline">
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}
        <AuthForm onError={setAuthError} loading={authLoading} setLoading={setAuthLoading} />
      </div>
    )
  }

  const selectedTopicProgress = selectedTopic ? getTopicProgress(selectedTopic.id) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Crowguide Logo"
                width={40}
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Crowguide</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Welcome back, {user.user_metadata?.full_name || user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <AIRoadmapGenerator userId={user.id} onPathGenerated={handlePathGenerated} />
              <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Learning Journey</h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-4 sm:mb-6">
            Master new skills with AI-powered personalized learning paths. Generate custom roadmaps tailored to your
            goals and experience level.
          </p>

          <LearningPathSelector
            userId={user.id}
            selectedPathId={selectedLearningPath}
            onPathSelect={setSelectedLearningPath}
            refreshTrigger={refreshTrigger}
          />
        </div>

        <RoadmapOverview
          userId={user.id}
          onTopicClick={handleTopicClick}
          refreshTrigger={refreshTrigger}
          selectedLearningPath={selectedLearningPath}
        />

        <TopicFocus
          topic={selectedTopic}
          userId={user.id}
          isOpen={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          onProgressUpdate={handleProgressUpdate}
          initialNotes={selectedTopicProgress?.notes || ""}
          initialCompleted={selectedTopicProgress?.completed || false}
        />
      </main>

      <Toaster />
    </div>
  )
}
