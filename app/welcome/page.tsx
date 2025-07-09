"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Target, Timer, BarChart3, ArrowRight } from "lucide-react"

export default function WelcomePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const features = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "AI-Generated Learning Paths",
      description: "Get personalized learning roadmaps created by AI",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Topic Focus Mode",
      description: "Deep dive into specific topics with focused learning",
    },
    {
      icon: <Timer className="w-6 h-6" />,
      title: "Pomodoro Timer",
      description: "Stay productive with built-in study timers",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Progress Tracking",
      description: "Monitor your learning progress and achievements",
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % features.length)
    }, 2000)

    return () => clearInterval(timer)
  }, [features.length])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl">🐦</div>
          <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to CrowGuide!
          </CardTitle>
          <CardDescription className="text-lg">
            Your AI-powered learning companion is ready to help you master any topic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  index === currentStep
                    ? "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-md"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      index === currentStep ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center space-x-2">
              <Badge variant="secondary">🎯 Personalized</Badge>
              <Badge variant="secondary">🤖 AI-Powered</Badge>
              <Badge variant="secondary">📊 Progress Tracking</Badge>
            </div>

            <Button
              onClick={() => router.push("/")}
              className="w-full md:w-auto px-8 py-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Start Learning Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
