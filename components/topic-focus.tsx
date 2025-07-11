"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Play, Pause, RotateCcw, Save, Plus, Trash2, Clock, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  updateProgress,
  getChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  updateUserStats,
  getUserStats,
  getCurrentUser,
  ensureUserExists,
  getUserProgress,
} from "@/lib/database"
import type { Topic, ChecklistItem } from "@/lib/supabase"

interface TopicFocusProps {
  topic: Topic | null
  userId: string
  isOpen: boolean
  onClose: () => void
  onProgressUpdate?: () => void
  initialNotes?: string
  initialCompleted?: boolean
}

interface NotionBlock {
  id: string
  type: "text" | "heading1" | "heading2" | "heading3" | "bullet" | "numbered" | "code"
  content: string
  order: number
}

export default function TopicFocus({
  topic,
  userId,
  isOpen,
  onClose,
  onProgressUpdate,
  initialNotes = "",
  initialCompleted = false,
}: TopicFocusProps) {
  const [blocks, setBlocks] = useState<NotionBlock[]>([])
  const [completed, setCompleted] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const { toast } = useToast()

  // Pomodoro state
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [isBreak, setIsBreak] = useState(false)
  const [studyTime, setStudyTime] = useState(0)
  const [completedSessions, setCompletedSessions] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedBlocksRef = useRef<NotionBlock[]>([])
  const lastSavedCompletedRef = useRef(false)
  const blockRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({})

  // Convert markdown string to blocks
  const markdownToBlocks = useCallback((markdown: string): NotionBlock[] => {
    if (!markdown.trim()) {
      return [
        {
          id: generateId(),
          type: "text",
          content: "",
          order: 0,
        },
      ]
    }

    const lines = markdown.split("\n")
    const blocks: NotionBlock[] = []
    let order = 0

    for (const line of lines) {
      const trimmedLine = line.trim()
      let blockType: NotionBlock["type"] = "text"
      let content = trimmedLine

      // Detect block type based on markdown syntax
      if (trimmedLine.startsWith("# ")) {
        blockType = "heading1"
        content = trimmedLine.substring(2)
      } else if (trimmedLine.startsWith("## ")) {
        blockType = "heading2"
        content = trimmedLine.substring(3)
      } else if (trimmedLine.startsWith("### ")) {
        blockType = "heading3"
        content = trimmedLine.substring(4)
      } else if (trimmedLine.startsWith("- ")) {
        blockType = "bullet"
        content = trimmedLine.substring(2)
      } else if (trimmedLine.match(/^\d+\. /)) {
        blockType = "numbered"
        content = trimmedLine.replace(/^\d+\. /, "")
      } else if (trimmedLine.startsWith("```")) {
        blockType = "code"
        content = trimmedLine.substring(3)
      }

      blocks.push({
        id: generateId(),
        type: blockType,
        content,
        order,
      })
      order++
    }

    return blocks.length > 0
      ? blocks
      : [
          {
            id: generateId(),
            type: "text",
            content: "",
            order: 0,
          },
        ]
  }, [])

  // Convert blocks to markdown string
  const blocksToMarkdown = useCallback((blocks: NotionBlock[]): string => {
    return blocks
      .sort((a, b) => a.order - b.order)
      .map((block) => {
        switch (block.type) {
          case "heading1":
            return `# ${block.content}`
          case "heading2":
            return `## ${block.content}`
          case "heading3":
            return `### ${block.content}`
          case "bullet":
            return `- ${block.content}`
          case "numbered":
            return `1. ${block.content}`
          case "code":
            return `\`\`\`${block.content}`
          default:
            return block.content
        }
      })
      .join("\n")
  }, [])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  // Load user progress when modal opens
  const loadUserProgress = useCallback(async () => {
    if (!topic || !userId || !isOpen) return

    console.log("Loading user progress for topic:", topic.id)
    setLoading(true)

    try {
      const userProgress = await getUserProgress(userId)
      const topicProgress = userProgress.find((p) => p.topic_id === topic.id)

      if (topicProgress) {
        const loadedNotes = topicProgress.notes || ""
        const loadedCompleted = topicProgress.completed || false

        console.log("Setting notes:", loadedNotes)
        console.log("Setting completed:", loadedCompleted)

        const loadedBlocks = markdownToBlocks(loadedNotes)
        setBlocks(loadedBlocks)
        setCompleted(loadedCompleted)
        lastSavedBlocksRef.current = loadedBlocks
        lastSavedCompletedRef.current = loadedCompleted
      } else {
        // No existing progress, use initial values
        console.log("No existing progress, using initial values")
        const initialBlocks = markdownToBlocks(initialNotes)
        setBlocks(initialBlocks)
        setCompleted(initialCompleted)
        lastSavedBlocksRef.current = initialBlocks
        lastSavedCompletedRef.current = initialCompleted
      }
    } catch (error) {
      console.error("Error loading user progress:", error)
      // Fallback to initial values
      const fallbackBlocks = markdownToBlocks(initialNotes)
      setBlocks(fallbackBlocks)
      setCompleted(initialCompleted)
      lastSavedBlocksRef.current = fallbackBlocks
      lastSavedCompletedRef.current = initialCompleted
    } finally {
      setLoading(false)
    }
  }, [topic, userId, isOpen, initialNotes, initialCompleted, markdownToBlocks])

  // Initialize component state when topic/modal opens
  useEffect(() => {
    if (topic && isOpen) {
      console.log("Modal opened for topic:", topic.title)

      // Reset session state
      setStudyTime(0)
      setCompletedSessions(0)
      setIsBreak(false)
      setPomodoroTime(workMinutes * 60)
      setIsRunning(false)
      setAutoSaveStatus("idle")

      // Load user progress from database
      loadUserProgress()
      loadChecklistItems()
    }
  }, [topic, isOpen, loadUserProgress])

  // Pomodoro timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            setIsRunning(false)

            if (!isBreak) {
              const sessionMinutes = workMinutes
              setStudyTime((currentStudyTime) => {
                const newStudyTime = currentStudyTime + sessionMinutes
                autoSaveProgress(newStudyTime)
                return newStudyTime
              })
              setCompletedSessions((prev) => prev + 1)
              setIsBreak(true)

              toast({
                title: "Work session complete! 🎉",
                description: `Added ${sessionMinutes} minutes and auto-saved your progress!`,
              })

              return breakMinutes * 60
            } else {
              setIsBreak(false)
              toast({
                title: "Break time over! 💪",
                description: "Ready for another work session?",
              })
              return workMinutes * 60
            }
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, workMinutes, breakMinutes, isBreak, toast])

  // Auto-save effect
  useEffect(() => {
    if (!topic || !userId || !isOpen || loading) return

    const hasChanges =
      JSON.stringify(blocks) !== JSON.stringify(lastSavedBlocksRef.current) ||
      completed !== lastSavedCompletedRef.current

    if (hasChanges) {
      console.log("Blocks changed, scheduling auto-save...")

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave()
      }, 2000)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [blocks, completed, topic, userId, isOpen, loading])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const loadChecklistItems = async () => {
    if (!topic || !userId) return
    try {
      const items = await getChecklistItems(userId, topic.id)
      setChecklistItems(items)
    } catch (error) {
      console.error("Error loading checklist items:", error)
      toast({
        title: "Error",
        description: "Failed to load checklist items",
        variant: "destructive",
      })
    }
  }

  const performAutoSave = useCallback(async () => {
    if (!topic || !userId) return

    const hasChanges =
      JSON.stringify(blocks) !== JSON.stringify(lastSavedBlocksRef.current) ||
      completed !== lastSavedCompletedRef.current

    if (!hasChanges) {
      console.log("No changes detected, skipping auto-save")
      return
    }

    console.log("Performing auto-save...")
    setAutoSaveStatus("saving")

    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      await ensureUserExists(currentUser.id, currentUser.email || "")

      const markdownNotes = blocksToMarkdown(blocks)
      await updateProgress(userId, topic.id, {
        notes: markdownNotes,
        completed,
        study_time: 0,
      })

      lastSavedBlocksRef.current = [...blocks]
      lastSavedCompletedRef.current = completed

      setAutoSaveStatus("saved")
      console.log("Auto-save completed successfully")

      setTimeout(() => {
        setAutoSaveStatus("idle")
      }, 2000)
    } catch (error: any) {
      console.error("Error auto-saving notes:", error)
      setAutoSaveStatus("error")

      toast({
        title: "Auto-save failed",
        description: error.message || "Failed to save notes automatically",
        variant: "destructive",
      })

      setTimeout(() => {
        setAutoSaveStatus("idle")
      }, 3000)
    }
  }, [blocks, completed, topic, userId, toast, blocksToMarkdown])

  const autoSaveProgress = async (currentStudyTime: number) => {
    if (!topic || !userId) return

    try {
      console.log("Auto-saving progress after work session...")

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      await ensureUserExists(currentUser.id, currentUser.email || "")

      const markdownNotes = blocksToMarkdown(blocks)
      await updateProgress(userId, topic.id, {
        notes: markdownNotes,
        completed,
        study_time: workMinutes,
      })

      const currentStats = await getUserStats(userId)
      const today = new Date().toISOString().split("T")[0]
      const isNewDay = currentStats?.last_study_date !== today

      const statsUpdate = {
        total_study_time: (currentStats?.total_study_time || 0) + workMinutes,
        current_streak: isNewDay ? (currentStats?.current_streak || 0) + 1 : currentStats?.current_streak || 0,
        last_study_date: today,
        total_notes: currentStats?.total_notes || 0,
      }

      await updateUserStats(userId, statsUpdate)

      lastSavedBlocksRef.current = [...blocks]
      lastSavedCompletedRef.current = completed

      if (onProgressUpdate) {
        onProgressUpdate()
      }

      console.log("Auto-save completed successfully")
    } catch (error: any) {
      console.error("Error auto-saving progress:", error)
      toast({
        title: "Auto-save failed",
        description: "Your study time was tracked but couldn't be saved automatically",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!topic || !userId) {
      toast({
        title: "Error",
        description: "Missing topic or user information",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      console.log("Starting manual save process...")

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      await ensureUserExists(currentUser.id, currentUser.email || "")

      const markdownNotes = blocksToMarkdown(blocks)
      await updateProgress(userId, topic.id, {
        notes: markdownNotes,
        completed,
        study_time: 0,
      })

      const currentStats = await getUserStats(userId)
      const statsUpdate = {
        total_study_time: currentStats?.total_study_time || 0,
        current_streak: currentStats?.current_streak || 0,
        last_study_date: currentStats?.last_study_date,
        total_notes: currentStats?.total_notes || 0,
      }

      await updateUserStats(userId, statsUpdate)

      lastSavedBlocksRef.current = [...blocks]
      lastSavedCompletedRef.current = completed

      toast({
        title: "Progress saved! ✅",
        description: `Your progress for "${topic.title}" has been saved.`,
      })

      if (onProgressUpdate) {
        onProgressUpdate()
      }

      onClose()
    } catch (error: any) {
      console.error("Detailed error saving progress:", error)
      toast({
        title: "Error",
        description: `Failed to save progress: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = useCallback(async () => {
    const hasUnsavedChanges =
      JSON.stringify(blocks) !== JSON.stringify(lastSavedBlocksRef.current) ||
      completed !== lastSavedCompletedRef.current

    if (hasUnsavedChanges) {
      console.log("Unsaved changes detected, performing final save...")
      await performAutoSave()
    }

    onClose()
  }, [blocks, completed, performAutoSave, onClose])

  // Block management functions
  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, content } : block)))
  }

  const addNewBlock = (afterId: string, type: NotionBlock["type"] = "text") => {
    const afterIndex = blocks.findIndex((block) => block.id === afterId)
    const newBlock: NotionBlock = {
      id: generateId(),
      type,
      content: "",
      order: afterIndex + 1,
    }

    setBlocks((prev) => {
      const newBlocks = [...prev]
      newBlocks.splice(afterIndex + 1, 0, newBlock)
      // Reorder all blocks
      return newBlocks.map((block, index) => ({ ...block, order: index }))
    })

    // Focus the new block
    setTimeout(() => {
      const input = blockRefs.current[newBlock.id]
      if (input) {
        input.focus()
      }
    }, 0)

    return newBlock.id
  }

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return // Always keep at least one block

    const blockIndex = blocks.findIndex((block) => block.id === id)
    setBlocks((prev) => {
      const newBlocks = prev.filter((block) => block.id !== id)
      return newBlocks.map((block, index) => ({ ...block, order: index }))
    })

    // Focus previous block or next block
    setTimeout(() => {
      const targetIndex = blockIndex > 0 ? blockIndex - 1 : 0
      const targetBlock = blocks[targetIndex]
      if (targetBlock && blockRefs.current[targetBlock.id]) {
        blockRefs.current[targetBlock.id].focus()
      }
    }, 0)
  }

  const changeBlockType = (id: string, newType: NotionBlock["type"]) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, type: newType } : block)))
  }

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addNewBlock(blockId)
    } else if (e.key === "Backspace") {
      const block = blocks.find((b) => b.id === blockId)
      if (block && block.content === "" && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)
      }
    } else if (e.key === "/") {
      // Could implement slash commands here
    }
  }

  const renderBlock = (block: NotionBlock) => {
    const commonProps = {
      ref: (el: HTMLInputElement | HTMLTextAreaElement) => {
        if (el) blockRefs.current[block.id] = el
      },
      value: block.content,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateBlock(block.id, e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, block.id),
      onFocus: () => setFocusedBlockId(block.id),
      onBlur: () => setFocusedBlockId(null),
      placeholder: getPlaceholder(block.type),
      className: getBlockClassName(block.type),
    }

    const showControls = focusedBlockId === block.id

    return (
      <div key={block.id} className="group relative">
        <div className="flex items-start gap-2">
          {/* Block type indicator */}
          <div className="flex-shrink-0 w-6 h-6 mt-1 flex items-center justify-center text-gray-400">
            {getBlockIcon(block.type)}
          </div>

          {/* Block content */}
          <div className="flex-1">
            {block.type === "code" ? (
              <textarea
                {...commonProps}
                ref={(el) => {
                  if (el && el instanceof HTMLTextAreaElement) {
                    // Only assign if it's a textarea
                    commonProps.ref?.(el);
                  }
                }}
                rows={3}
                className={`${commonProps.className} resize-none font-mono text-sm`}
              />
            ) : (
              <input
                {...commonProps}
                ref={(el) => {
                  if (el && el instanceof HTMLInputElement) {
                    // Only assign if it's an input
                    commonProps.ref?.(el);
                  }
                }}
                type="text"
              />
            )}
          </div>


          {/* Block controls */}
          {showControls && (
            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Select onValueChange={(value) => changeBlockType(block.id, value as NotionBlock["type"])}>
                <SelectTrigger className="h-6 w-6 p-0 border-0">
                  <div className="w-4 h-4 text-gray-400">⋮</div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="heading1">Heading 1</SelectItem>
                  <SelectItem value="heading2">Heading 2</SelectItem>
                  <SelectItem value="heading3">Heading 3</SelectItem>
                  <SelectItem value="bullet">Bullet List</SelectItem>
                  <SelectItem value="numbered">Numbered List</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                </SelectContent>
              </Select>

              {blocks.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  onClick={() => deleteBlock(block.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const getBlockIcon = (type: NotionBlock["type"]) => {
    switch (type) {
      case "heading1":
        return "H1"
      case "heading2":
        return "H2"
      case "heading3":
        return "H3"
      case "bullet":
        return "•"
      case "numbered":
        return "1."
      case "code":
        return "{}"
      default:
        return "T"
    }
  }

  const getPlaceholder = (type: NotionBlock["type"]) => {
    switch (type) {
      case "heading1":
        return "Heading 1"
      case "heading2":
        return "Heading 2"
      case "heading3":
        return "Heading 3"
      case "bullet":
        return "Bullet point"
      case "numbered":
        return "Numbered item"
      case "code":
        return "Code block"
      default:
        return "Type '/' for commands..."
    }
  }

  const getBlockClassName = (type: NotionBlock["type"]) => {
    const baseClass = "w-full border-0 outline-none bg-transparent resize-none"

    switch (type) {
      case "heading1":
        return `${baseClass} text-2xl font-bold text-black py-2`
      case "heading2":
        return `${baseClass} text-xl font-semibold text-black py-2`
      case "heading3":
        return `${baseClass} text-lg font-semibold text-black py-1`
      case "code":
        return `${baseClass} font-mono text-sm bg-gray-50 p-2 rounded border text-black`
      default:
        return `${baseClass} text-black py-1`
    }
  }

  // Checklist functions (keeping existing functionality)
  const handleAddChecklistItem = async () => {
    if (!topic || !userId || !newChecklistItem.trim()) {
      toast({
        title: "Error",
        description: "Please enter a checklist item",
        variant: "destructive",
      })
      return
    }

    try {
      await addChecklistItem(userId, topic.id, newChecklistItem.trim())
      setNewChecklistItem("")
      await loadChecklistItems()
      toast({
        title: "Item added! ✅",
        description: "Checklist item has been added",
      })
    } catch (error: any) {
      console.error("Error adding checklist item:", error)
      toast({
        title: "Error",
        description: `Failed to add checklist item: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleToggleChecklistItem = async (item: ChecklistItem) => {
    try {
      await updateChecklistItem(item.id, { completed: !item.completed })
      await loadChecklistItems()
      toast({
        title: item.completed ? "Item unchecked" : "Item completed! ✅",
        description: `"${item.content}" ${item.completed ? "unchecked" : "marked as complete"}`,
      })
    } catch (error: any) {
      console.error("Error updating checklist item:", error)
      toast({
        title: "Error",
        description: `Failed to update checklist item: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      await deleteChecklistItem(itemId)
      await loadChecklistItems()
      toast({
        title: "Item deleted",
        description: "Checklist item has been removed",
      })
    } catch (error: any) {
      console.error("Error deleting checklist item:", error)
      toast({
        title: "Error",
        description: `Failed to delete checklist item: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Pomodoro functions (keeping existing functionality)
  const startPomodoro = () => {
    setIsRunning(true)
    toast({
      title: "Pomodoro started! 🍅",
      description: `${isBreak ? "Break" : "Work"} session in progress`,
    })
  }

  const pausePomodoro = () => {
    setIsRunning(false)
    toast({
      title: "Pomodoro paused",
      description: "Timer has been paused",
    })
  }

  const resetPomodoro = () => {
    setIsRunning(false)
    setIsBreak(false)
    setPomodoroTime(workMinutes * 60)
    toast({
      title: "Pomodoro reset",
      description: "Timer has been reset to work session",
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getSessionStatus = () => {
    if (!isRunning && pomodoroTime === workMinutes * 60 && !isBreak) {
      return "Ready to Start"
    }
    if (isBreak) {
      return isRunning ? "Break Time" : "Break Paused"
    }
    return isRunning ? "Work Session" : "Work Paused"
  }

  const getAutoSaveIndicator = () => {
    switch (autoSaveStatus) {
      case "saving":
        return (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Saving...
          </div>
        )
      case "saved":
        return (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Check className="w-3 h-3" />
            Auto-saved
          </div>
        )
      case "error":
        return (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <span>⚠️</span>
            Save failed
          </div>
        )
      default:
        return null
    }
  }

  if (!topic) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader className="sticky top-0 z-20 bg-white/90 backdrop-blur border rounded-2xl shadow-md p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start pr-0 sm:pr-12">
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🎯</span>
                <span className="text-lg sm:text-xl">{topic.title}</span>
              </div>
              {completed && <Badge className="bg-green-500 self-start sm:self-center">Completed</Badge>}
            </DialogTitle>

            <div className="flex flex-row sm:flex-col items-end sm:items-end gap-1 sm:gap-1 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-primary">{formatTime(pomodoroTime)}</span>
              </div>
              <Badge
                variant={isRunning ? "default" : "secondary"}
                className={`text-xs text-center ${isBreak ? "bg-blue-500" : isRunning ? "bg-green-500" : "bg-gray-500"}`}
              >
                {getSessionStatus()}
              </Badge>
              {studyTime > 0 && (
                <div className="text-xs text-muted-foreground">
                  {studyTime}min • {completedSessions} sessions
                </div>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base pr-12">{topic.description}</p>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading your notes...
            </div>
          </div>
        )}

        {!loading && (
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
              <TabsTrigger value="notes" className="px-2 sm:px-4">
                📝 Notes
              </TabsTrigger>
              <TabsTrigger value="pomodoro" className="px-2 sm:px-4">
                🍅 Timer
              </TabsTrigger>
              <TabsTrigger value="checklist" className="px-2 sm:px-4">
                ✅ Tasks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Your Notes</CardTitle>
                    {getAutoSaveIndicator()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Notion-like Block Editor */}
                  <div className="space-y-2 min-h-[350px] p-4 border rounded-md bg-white">
                    {blocks.map(renderBlock)}

                    {blocks.length === 0 && (
                      <div className="text-gray-400 text-center py-8">Start typing to create your first note...</div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                    💡 <strong>Notion-like Editor:</strong> Each line is editable! Press Enter to create new blocks,
                    Backspace on empty lines to delete. Hover over blocks to see formatting options. Auto-saves every 2
                    seconds.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pomodoro" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pomodoro Timer</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <div className="text-6xl font-bold text-primary">{formatTime(pomodoroTime)}</div>

                  <div className="flex justify-center gap-4">
                    <Button onClick={startPomodoro} disabled={isRunning}>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                    <Button onClick={pausePomodoro} disabled={!isRunning} variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button onClick={resetPomodoro} variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>

                  <div className="flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <label>Work:</label>
                      <Input
                        type="number"
                        value={workMinutes}
                        onChange={(e) => {
                          const newWorkMinutes = Number(e.target.value)
                          setWorkMinutes(newWorkMinutes)
                          if (!isRunning && !isBreak) {
                            setPomodoroTime(newWorkMinutes * 60)
                          }
                        }}
                        className="w-16"
                        min="1"
                        max="60"
                        disabled={isRunning}
                      />
                      <span>min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label>Break:</label>
                      <Input
                        type="number"
                        value={breakMinutes}
                        onChange={(e) => {
                          const newBreakMinutes = Number(e.target.value)
                          setBreakMinutes(newBreakMinutes)
                          if (!isRunning && isBreak) {
                            setPomodoroTime(newBreakMinutes * 60)
                          }
                        }}
                        className="w-16"
                        min="1"
                        max="30"
                        disabled={isRunning}
                      />
                      <span>min</span>
                    </div>
                  </div>

                  {isBreak && (
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      Break Time! 🎉
                    </Badge>
                  )}

                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-primary">
                      Study Time This Session: {studyTime} minutes
                    </div>
                    <div className="text-sm text-muted-foreground">Completed Sessions: {completedSessions}</div>
                    <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                      💡 Study time is automatically saved when each work session completes!
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add a key point or task..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddChecklistItem()
                        }
                      }}
                    />
                    <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          item.completed ? "bg-green-50 border-green-200" : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox checked={item.completed} onCheckedChange={() => handleToggleChecklistItem(item)} />
                        <span className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.content}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {checklistItems.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 border-2 border-dashed border-muted rounded-lg">
                      <div className="text-4xl mb-2">📝</div>
                      <p>No checklist items yet</p>
                      <p className="text-sm">Add some key points to track your progress!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="completed"
              checked={completed}
              onCheckedChange={(checked) => setCompleted(checked as boolean)}
            />
            <label htmlFor="completed" className="text-sm font-medium">
              Mark as completed
            </label>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Progress"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
